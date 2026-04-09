import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { CreateGeneradorDto, UpdateGeneradorDto, GeneradorQueryDto } from './dto';

@Injectable()
export class GeneradoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGeneradorDto) {
    const password_hash = await argon2.hash(dto.password);

    return this.prisma.usuario.create({
      data: {
        email: dto.email,
        password_hash,
        rol: 'GENERADOR',
        generador: {
          create: {
            razon_social: dto.razon_social,
            tipo_generador_id: dto.tipo_generador_id,
            contacto_nombre: dto.contacto_nombre,
            contacto_telefono: dto.contacto_telefono,
            contacto_email: dto.contacto_email,
            latitud: dto.latitud,
            longitud: dto.longitud,
          },
        },
      },
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        fecha_creacion: true,
        generador: {
          include: { tipo_generador: true },
        },
      },
    });
  }

  async findAll(query: GeneradorQueryDto) {
    const where: Prisma.generadorWhereInput = {
      activo: query.activo,
      tipo_generador_id: query.tipo_generador_id,
      ...(query.search
        ? { razon_social: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.generador.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { razon_social: query.sortOrder },
        include: {
          usuario: { select: { email: true, activo: true } },
          tipo_generador: true,
        },
      }),
      this.prisma.generador.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findAllForMap() {
    return this.prisma.generador.findMany({
      select: {
        id: true,
        razon_social: true,
        latitud: true,
        longitud: true,
        activo: true,
        tipo_generador: { select: { nombre: true } },
      },
      orderBy: { razon_social: 'asc' },
    });
  }

  async findOne(id: number) {
    const generador = await this.prisma.generador.findUnique({
      where: { id },
      include: {
        usuario: { select: { email: true, activo: true } },
        tipo_generador: true,
      },
    });

    if (!generador) throw new NotFoundException('Generador no encontrado');
    return generador;
  }

  async update(id: number, dto: UpdateGeneradorDto) {
    const generador = await this.findOne(id);
    const { activo, ...generadorData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(generadorData).length > 0) {
        await tx.generador.update({
          where: { id },
          data: generadorData,
        });
      }

      if (activo !== undefined) {
        await tx.generador.update({
          where: { id },
          data: { activo },
        });
        await tx.usuario.update({
          where: { id: generador.usuario_id },
          data: { activo },
        });
      }

      return tx.generador.findUniqueOrThrow({
        where: { id },
        include: {
          usuario: { select: { email: true, activo: true } },
          tipo_generador: true,
        },
      });
    });
  }

  async hardDelete(id: number) {
    const generador = await this.findOne(id);
    await this.prisma.usuario.delete({
      where: { id: generador.usuario_id },
    });
  }
}
