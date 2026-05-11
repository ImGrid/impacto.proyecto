import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, ROLES_KEY } from '../decorators';
import { rol_usuario } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Si el endpoint es @Public(), no hay rol que validar (request.user es
    // undefined). Esto permite que un controller con @Roles() a nivel clase
    // tenga endpoints públicos a nivel método (ej: GET /departamentos para
    // la pantalla pre-login del admin web).
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Obtiene los roles requeridos del decorador @Roles()
    const requiredRoles = this.reflector.getAllAndOverride<rol_usuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Si la ruta no tiene @Roles(), cualquier usuario autenticado puede acceder
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.rol);
  }
}
