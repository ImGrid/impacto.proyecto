import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from '../types';

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  // passReqToCallback: true nos da acceso al Request para extraer el token raw.
  // Necesitamos el token raw para verificar su hash contra la BD.
  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req
      .get('Authorization')
      ?.replace('Bearer', '')
      .trim();

    return {
      userId: payload.sub,
      identificador: payload.identificador,
      rol: payload.rol,
      refreshToken,
    };
  }
}
