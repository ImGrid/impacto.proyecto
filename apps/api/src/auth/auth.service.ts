import {
  BadRequestException,
  Injectable,
  NotFoundException,
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

    // 4. Resolver departamento activo según rol
    const { departamentoActivo, departamentoFijo } =
      await this.resolveDepartamentoActivoEnLogin(
        usuario.id,
        usuario.rol,
        dto.departamento_id,
      );

    // 5. Generar tokens y guardar refresh en BD
    const tokens = await this.generateTokens(
      usuario.id,
      usuario.identificador,
      usuario.rol,
      departamentoActivo,
      departamentoFijo,
    );
    await this.saveRefreshToken(usuario.id, tokens.refresh_token, dispositivo);

    return tokens;
  }

  /**
   * Cambia el departamento activo de la sesión del admin.
   * - Invalida TODAS las sesiones del usuario y emite un par nuevo.
   * - Solo aplica a rol ADMIN (los demás roles tienen depto fijo).
   */
  async switchDepartamento(
    userId: number,
    departamentoId: number,
    dispositivo?: string | null,
  ) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });

    if (!usuario || !usuario.activo) {
      throw new ForbiddenException('Usuario no encontrado o desactivado');
    }

    if (usuario.rol !== 'ADMIN') {
      throw new ForbiddenException(
        'Solo los administradores pueden cambiar de departamento',
      );
    }

    // Un admin ASIGNADO a un departamento no puede cambiarse a otro.
    // Solo los admins globales (sin departamento asignado) usan el switcher.
    const admin = await this.prisma.administrador.findUnique({
      where: { usuario_id: userId },
      select: { departamento_id: true },
    });
    if (admin?.departamento_id != null) {
      throw new ForbiddenException(
        'Está asignado a un departamento y no puede cambiarlo',
      );
    }

    const departamento = await this.prisma.departamento.findUnique({
      where: { id: departamentoId },
      select: { id: true, activo: true },
    });

    if (!departamento || !departamento.activo) {
      throw new NotFoundException('Departamento no encontrado o inactivo');
    }

    // Rotación total: borrar todas las sesiones del admin y emitir un par nuevo.
    // Así evitamos que tokens viejos con otro departamento sigan vivos.
    await this.prisma.sesion_refresh.deleteMany({
      where: { usuario_id: userId },
    });

    // Solo admins globales llegan aquí, así que el depto no es fijo.
    const tokens = await this.generateTokens(
      usuario.id,
      usuario.identificador,
      usuario.rol,
      departamento.id,
      false,
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

  async refreshTokens(
    userId: number,
    refreshToken: string,
    departamentoActivo: number | null,
  ) {
    const tokenHash = this.hashToken(refreshToken);
    const cacheKey = `${userId}:${tokenHash}`;

    // Coalescing: si ya hay un refresh en vuelo (o recién terminado)
    // con el mismo refresh_token, devolvemos el mismo resultado.
    const cached = this.refreshCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.promise;
    }

    const promise = this.doRefresh(userId, refreshToken, departamentoActivo);
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

  private async doRefresh(
    userId: number,
    refreshToken: string,
    departamentoActivoDelToken: number | null,
  ) {
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

    // 4. Preservar el departamento activo del token original (no recalcular).
    //    Si por algún motivo no viene (refresh muy viejo previo a la migración),
    //    se recalcula según el rol; admin sin depto se fuerza a re-loguear.
    const departamentoActivo =
      departamentoActivoDelToken !== null
        ? departamentoActivoDelToken
        : await this.resolveDepartamentoActivoDelUsuario(
            usuario.id,
            usuario.rol,
          );

    if (usuario.rol === 'ADMIN' && departamentoActivo === null) {
      // Admin sin depto en el token: fuerza a re-iniciar sesión para elegir uno.
      await this.prisma.sesion_refresh.delete({ where: { id: sesion.id } });
      throw new ForbiddenException(
        'Sesión sin departamento activo. Vuelva a iniciar sesión.',
      );
    }

    // 5. Rotación: borrar token viejo, generar nuevo par
    await this.prisma.sesion_refresh.delete({ where: { id: sesion.id } });

    // Recalcular si el admin tiene departamento fijo (su asignación pudo
    // cambiar entre sesiones). Para roles no-admin el depto siempre es fijo.
    let departamentoFijo = true;
    if (usuario.rol === 'ADMIN') {
      const admin = await this.prisma.administrador.findUnique({
        where: { usuario_id: usuario.id },
        select: { departamento_id: true },
      });
      departamentoFijo = admin?.departamento_id != null;
    }

    const tokens = await this.generateTokens(
      usuario.id,
      usuario.identificador,
      usuario.rol,
      departamentoActivo,
      departamentoFijo,
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

  /**
   * Resuelve el `departamento_activo` y si es fijo, para el JWT del login.
   *
   * Reglas:
   * - ADMIN ASIGNADO (tiene `administrador.departamento_id`): se le fuerza
   *   ese departamento; no puede ingresar a otro. `departamentoFijo = true`.
   * - ADMIN GLOBAL (sin departamento asignado): usa `dto.departamento_id`,
   *   obligatorio, debe existir y estar activo. `departamentoFijo = false`.
   * - RECOLECTOR / ACOPIADOR: el de su actor (fijo en BD). `fijo = true`.
   * - GENERADOR: null (entidad global). `fijo = true` (no usa switcher).
   */
  private async resolveDepartamentoActivoEnLogin(
    userId: number,
    rol: string,
    departamentoIdInput: number | undefined,
  ): Promise<{ departamentoActivo: number | null; departamentoFijo: boolean }> {
    if (rol === 'ADMIN') {
      const admin = await this.prisma.administrador.findUnique({
        where: { usuario_id: userId },
        select: {
          departamento_id: true,
          departamento: { select: { nombre: true } },
        },
      });
      if (!admin) {
        throw new UnauthorizedException(
          'Perfil de administrador no encontrado',
        );
      }

      // Admin ASIGNADO a un departamento: se le fuerza ese depto.
      if (admin.departamento_id !== null) {
        if (
          departamentoIdInput !== undefined &&
          departamentoIdInput !== admin.departamento_id
        ) {
          const nombreDepto = admin.departamento?.nombre ?? 'su departamento';
          throw new BadRequestException(
            `Está asignado al departamento ${nombreDepto}. Seleccione ese departamento para iniciar sesión.`,
          );
        }
        return {
          departamentoActivo: admin.departamento_id,
          departamentoFijo: true,
        };
      }

      // Admin GLOBAL: elige departamento al entrar.
      if (!departamentoIdInput) {
        throw new BadRequestException(
          'Debe seleccionar un departamento para iniciar sesión',
        );
      }
      const departamento = await this.prisma.departamento.findUnique({
        where: { id: departamentoIdInput },
        select: { id: true, activo: true },
      });
      if (!departamento || !departamento.activo) {
        throw new BadRequestException('Departamento no encontrado o inactivo');
      }
      return { departamentoActivo: departamento.id, departamentoFijo: false };
    }

    // Roles no-admin: departamento fijo del actor (o null para generador).
    const departamentoActivo = await this.resolveDepartamentoActivoDelUsuario(
      userId,
      rol,
    );
    return { departamentoActivo, departamentoFijo: true };
  }

  /**
   * Lee el departamento del actor asociado al usuario (recolector,
   * centro operacional). Para generador devuelve null.
   * No aplica a ADMIN (el admin elige al loguearse).
   */
  private async resolveDepartamentoActivoDelUsuario(
    userId: number,
    rol: string,
  ): Promise<number | null> {
    if (rol === 'RECOLECTOR') {
      const recolector = await this.prisma.recolector.findUnique({
        where: { usuario_id: userId },
        select: { departamento_id: true },
      });
      if (!recolector) {
        throw new UnauthorizedException(
          'Perfil de recolector no encontrado',
        );
      }
      return recolector.departamento_id;
    }

    if (rol === 'ACOPIADOR') {
      const centro = await this.prisma.centro_operacional.findUnique({
        where: { usuario_id: userId },
        select: { departamento_id: true },
      });
      if (!centro) {
        throw new UnauthorizedException(
          'Perfil de centro operacional no encontrado',
        );
      }
      return centro.departamento_id;
    }

    if (rol === 'GENERADOR') {
      return null;
    }

    // ADMIN no debería llegar aquí; se maneja en resolveDepartamentoActivoEnLogin.
    return null;
  }

  private async generateTokens(
    userId: number,
    identificador: string,
    rol: string,
    departamento_activo: number | null,
    departamento_fijo: boolean,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      identificador,
      rol,
      departamento_activo,
      departamento_fijo,
    };

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
