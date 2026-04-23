import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { LoginDto } from './dto';
import { JwtPayload } from './types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto, dispositivo?: string) {
    // 1. Buscar usuario por identificador (email, CI o teléfono según rol)
    // Normalizar: quitar espacios (CI boliviano puede venir con espacio: "9876543 CB")
    const identificadorNormalizado = dto.identificador.replace(/\s+/g, '');
    const usuario = await this.prisma.usuario.findUnique({
      where: { identificador: identificadorNormalizado },
    });

    if (!usuario) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 2. Verificar que esté activo
    if (!usuario.activo) {
      throw new UnauthorizedException('Usuario desactivado');
    }

    // 3. Verificar password con Argon2
    const passwordValid = await argon2.verify(
      usuario.password_hash,
      dto.password,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // 4. Generar tokens y guardar refresh en BD
    const tokens = await this.generateTokens(
      usuario.id,
      usuario.identificador,
      usuario.rol,
    );
    await this.saveRefreshToken(usuario.id, tokens.refresh_token, dispositivo);

    return tokens;
  }

  // Cache en-memoria para defender contra race conditions cuando dos
  // refresh llegan con el mismo refresh_token casi al mismo tiempo
  // (middleware + fetch del cliente, dos tabs, etc.). Si una rotación
  // ya terminó en los últimos RACE_WINDOW_MS, el segundo refresh
  // recibe el mismo par de tokens en vez de un 403. La ventana es
  // corta para no abrir una puerta a replay.
  //
  // Referencias consultadas:
  //   - https://gist.github.com/Daanieeel/6e4d07bb797de96e469d2a1129bd3891
  //   - https://dev.to/silentwatcher_95/race-conditions-in-jwt-refresh-token-rotation-3j5k
  //   - vercel/next.js discussion #78604
  private readonly refreshCache = new Map<
    string,
    { promise: Promise<{ access_token: string; refresh_token: string }>; expiresAt: number }
  >();
  private readonly REFRESH_RACE_WINDOW_MS = 5_000;

  async refreshTokens(userId: number, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    const cacheKey = `${userId}:${tokenHash}`;

    // Coalescing: si ya hay un refresh en vuelo (o recién terminado)
    // con el mismo refresh_token, devolvemos el mismo resultado.
    const cached = this.refreshCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.promise;
    }

    const promise = this.doRefresh(userId, refreshToken);
    this.refreshCache.set(cacheKey, {
      promise,
      expiresAt: Date.now() + this.REFRESH_RACE_WINDOW_MS,
    });

    // Si el refresh falla, eliminar del cache inmediatamente para no
    // atrapar errores durante la ventana.
    promise.catch(() => {
      this.refreshCache.delete(cacheKey);
    });

    // Cleanup automático al cerrar la ventana.
    setTimeout(() => {
      this.refreshCache.delete(cacheKey);
    }, this.REFRESH_RACE_WINDOW_MS).unref?.();

    return promise;
  }

  private async doRefresh(userId: number, refreshToken: string) {
    // 1. Buscar la sesión por hash del token
    const tokenHash = this.hashToken(refreshToken);
    const sesion = await this.prisma.sesion_refresh.findFirst({
      where: {
        usuario_id: userId,
        token_hash: tokenHash,
      },
    });

    if (!sesion) {
      throw new ForbiddenException('Refresh token inválido');
    }

    // 2. Verificar que no haya expirado
    if (sesion.expira_en < new Date()) {
      // Limpiar la sesión expirada
      await this.prisma.sesion_refresh.delete({ where: { id: sesion.id } });
      throw new ForbiddenException('Refresh token expirado');
    }

    // 3. Obtener usuario para el payload
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario || !usuario.activo) {
      throw new ForbiddenException('Usuario no encontrado o desactivado');
    }

    // 4. Rotación: borrar token viejo, generar nuevo par
    await this.prisma.sesion_refresh.delete({ where: { id: sesion.id } });

    const tokens = await this.generateTokens(
      usuario.id,
      usuario.identificador,
      usuario.rol,
    );
    await this.saveRefreshToken(
      usuario.id,
      tokens.refresh_token,
      sesion.dispositivo,
    );

    return tokens;
  }

  async logout(userId: number, refreshToken: string) {
    const tokenHash = this.hashToken(refreshToken);
    await this.prisma.sesion_refresh.deleteMany({
      where: {
        usuario_id: userId,
        token_hash: tokenHash,
      },
    });
  }

  async logoutAll(userId: number) {
    await this.prisma.sesion_refresh.deleteMany({
      where: { usuario_id: userId },
    });
  }

  async updateDeviceToken(userId: number, deviceToken: string) {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { device_token: deviceToken },
    });
  }

  // --- Helpers privados ---

  private async generateTokens(userId: number, identificador: string, rol: string) {
    const payload: JwtPayload = { sub: userId, identificador, rol };

    // El refresh lleva un `jti` (JWT ID) único para que cada emisión sea
    // distinta incluso cuando dos refresh caen en el mismo segundo
    // (iat tiene resolución de 1 segundo; sin jti el token rotado
    // queda idéntico al anterior). RFC 7519 §4.1.7.
    const refreshPayload = { ...payload, jti: randomUUID() };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async saveRefreshToken(
    userId: number,
    refreshToken: string,
    dispositivo?: string | null,
  ) {
    const tokenHash = this.hashToken(refreshToken);

    // Límite: máximo 3 sesiones por usuario. Si excede, borrar la más antigua.
    const sesiones = await this.prisma.sesion_refresh.findMany({
      where: { usuario_id: userId },
      orderBy: { creado_en: 'asc' },
    });

    if (sesiones.length >= 3) {
      await this.prisma.sesion_refresh.delete({
        where: { id: sesiones[0].id },
      });
    }

    // Calcular fecha de expiración (7 días por defecto)
    const expiraEn = new Date();
    expiraEn.setDate(expiraEn.getDate() + 7);

    await this.prisma.sesion_refresh.create({
      data: {
        usuario_id: userId,
        token_hash: tokenHash,
        dispositivo: dispositivo ?? null,
        expira_en: expiraEn,
      },
    });
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
