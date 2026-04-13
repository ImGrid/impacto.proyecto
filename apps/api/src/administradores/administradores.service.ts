import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreateAdministradorDto,
  UpdateAdministradorDto,
  AdministradorQueryDto,
} from './dto';

@Injectable()
export class AdministradoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdministradorDto) {
    const password_hash = await argon2.hash(dto.password);

    return this.prisma.usuario.create({
      data: {
        email: dto.email,
        identificador: dto.email,
        password_hash,
        rol: 'ADMIN',
        administrador: {
          create: {
            nombre_completo: dto.nombre_completo,
            telefono: dto.telefono,
          },
        },
      },
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        fecha_creacion: true,
        administrador: true,
      },
    });
  }

  async findAll(query: AdministradorQueryDto) {
    const where: Prisma.administradorWhereInput = {
      ...(query.activo !== undefined
        ? { usuario: { activo: query.activo } }
        : {}),
      ...(query.search
        ? { nombre_completo: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.administrador.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre_completo: query.sortOrder },
        include: {
          usuario: { select: { email: true, activo: true } },
        },
      }),
      this.prisma.administrador.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const administrador = await this.prisma.administrador.findUnique({
      where: { id },
      include: {
        usuario: { select: { email: true, activo: true } },
      },
    });

    if (!administrador)
      throw new NotFoundException('Administrador no encontrado');
    return administrador;
  }

  async update(id: number, dto: UpdateAdministradorDto) {
    const administrador = await this.findOne(id);

    const { activo, ...adminData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Actualizar campos del administrador si hay
      if (Object.keys(adminData).length > 0) {
        await tx.administrador.update({
          where: { id },
          data: adminData,
        });
      }

      // Actualizar activo en usuario si se envió
      if (activo !== undefined) {
        await tx.usuario.update({
          where: { id: administrador.usuario_id },
          data: { activo },
        });
      }

      return tx.administrador.findUniqueOrThrow({
        where: { id },
        include: {
          usuario: { select: { email: true, activo: true } },
        },
      });
    });
  }

  async hardDelete(id: number, currentUserId: number) {
    const administrador = await this.findOne(id);

    // No permitir que un admin se elimine a sí mismo
    if (administrador.usuario_id === currentUserId) {
      throw new ForbiddenException(
        'No puedes eliminar tu propia cuenta de administrador',
      );
    }

    // Borrar el usuario (cascadea a administrador + sesion_refresh)
    await this.prisma.usuario.delete({
      where: { id: administrador.usuario_id },
    });
  }
}
