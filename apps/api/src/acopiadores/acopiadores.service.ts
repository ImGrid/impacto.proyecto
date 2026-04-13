import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { normalizarCI } from '../common/helpers';
import { CreateAcopiadorDto, UpdateAcopiadorDto, AcopiadorQueryDto } from './dto';

@Injectable()
export class AcopiadoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAcopiadorDto) {
    const password_hash = await argon2.hash(dto.password);

    return this.prisma.usuario.create({
      data: {
        email: dto.email,
        identificador: dto.email,
        password_hash,
        rol: 'ACOPIADOR',
        acopiador: {
          create: {
            nombre_completo: dto.nombre_completo,
            cedula_identidad: normalizarCI(dto.cedula_identidad),
            celular: dto.celular,
            tipo_acopio: dto.tipo_acopio,
            nombre_punto: dto.nombre_punto,
            direccion: dto.direccion,
            latitud: dto.latitud,
            longitud: dto.longitud,
            zona_id: dto.zona_id,
            horario_operacion: dto.horario_operacion,
          },
        },
      },
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        fecha_creacion: true,
        acopiador: true,
      },
    });
  }

  async findAll(query: AcopiadorQueryDto) {
    const where: Prisma.acopiadorWhereInput = {
      activo: query.activo,
      zona_id: query.zona_id,
      tipo_acopio: query.tipo_acopio,
      ...(query.search
        ? { nombre_completo: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.acopiador.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre_completo: query.sortOrder },
        include: {
          usuario: { select: { email: true, activo: true } },
          zona: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.acopiador.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findAllForMap() {
    return this.prisma.acopiador.findMany({
      select: {
        id: true,
        nombre_completo: true,
        nombre_punto: true,
        tipo_acopio: true,
        latitud: true,
        longitud: true,
        activo: true,
        zona: { select: { nombre: true } },
      },
      orderBy: { nombre_completo: 'asc' },
    });
  }

  async findOne(id: number) {
    const acopiador = await this.prisma.acopiador.findUnique({
      where: { id },
      include: {
        usuario: { select: { email: true, activo: true } },
        zona: { select: { id: true, nombre: true } },
      },
    });

    if (!acopiador) throw new NotFoundException('Acopiador no encontrado');
    return acopiador;
  }

  async update(id: number, dto: UpdateAcopiadorDto) {
    const acopiador = await this.findOne(id);
    const { activo, ...acopiadorData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(acopiadorData).length > 0) {
        await tx.acopiador.update({
          where: { id },
          data: acopiadorData,
        });
      }

      if (activo !== undefined) {
        await tx.acopiador.update({
          where: { id },
          data: { activo },
        });
        await tx.usuario.update({
          where: { id: acopiador.usuario_id },
          data: { activo },
        });
      }

      return tx.acopiador.findUniqueOrThrow({
        where: { id },
        include: {
          usuario: { select: { email: true, activo: true } },
          zona: { select: { id: true, nombre: true } },
        },
      });
    });
  }

  async hardDelete(id: number) {
    const acopiador = await this.findOne(id);
    await this.prisma.usuario.delete({
      where: { id: acopiador.usuario_id },
    });
  }
}
