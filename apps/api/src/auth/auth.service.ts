import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
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
    // 1. Buscar usuario por email
    const usuario = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
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
      usuario.email,
      usuario.rol,
    );
    await this.saveRefreshToken(usuario.id, tokens.refresh_token, dispositivo);

    return tokens;
  }

  async refreshTokens(userId: number, refreshToken: string) {
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
      usuario.email,
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

  // --- Helpers privados ---

  private async generateTokens(userId: number, email: string, rol: string) {
    const payload: JwtPayload = { sub: userId, email, rol };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
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
