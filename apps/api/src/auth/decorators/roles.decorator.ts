import { SetMetadata } from '@nestjs/common';
import { rol_usuario } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: rol_usuario[]) => SetMetadata(ROLES_KEY, roles);
