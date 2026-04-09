import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreateRecolectorDto,
  UpdateRecolectorDto,
  RecolectorQueryDto,
} from './dto';

const recolectorInclude = {
  usuario: { select: { email: true, activo: true } },
  acopiador: {
    select: { id: true, nombre_completo: true, nombre_punto: true },
  },
  zona: { select: { id: true, nombre: true } },
  asociacion: { select: { id: true, nombre: true } },
  recolector_dia_trabajo: { select: { dia_semana: true } },
  recolector_material: {
    include: { material: { select: { id: true, nombre: true } } },
  },
  recolector_tipo_generador: {
    include: { tipo_generador: { select: { id: true, nombre: true } } },
  },
} satisfies Prisma.recolectorInclude;

@Injectable()
export class RecolectoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRecolectorDto) {
    const password_hash = await argon2.hash(dto.password);

    return this.prisma.$transaction(async (tx) => {
      // 1. Create usuario + recolector (nested write)
      const usuario = await tx.usuario.create({
        data: {
          email: dto.email,
          password_hash,
          rol: 'RECOLECTOR',
          recolector: {
            create: {
              nombre_completo: dto.nombre_completo,
              cedula_identidad: dto.cedula_identidad,
              celular: dto.celular,
              direccion_domicilio: dto.direccion_domicilio,
              latitud: dto.latitud,
              longitud: dto.longitud,
              acopiador_id: dto.acopiador_id,
              zona_id: dto.zona_id,
              asociacion_id: dto.asociacion_id,
              genero: dto.genero,
              edad: dto.edad,
              trabaja_individual: dto.trabaja_individual ?? true,
            },
          },
        },
        select: {
          id: true,
          email: true,
          rol: true,
          activo: true,
          fecha_creacion: true,
          recolector: true,
        },
      });

      const recolectorId = usuario.recolector!.id;

      // 2. Días de trabajo
      if (dto.dias_trabajo?.length) {
        await tx.recolector_dia_trabajo.createMany({
          data: dto.dias_trabajo.map((dia) => ({
            recolector_id: recolectorId,
            dia_semana: dia,
          })),
        });
      }

      // 3. Materiales
      if (dto.materiales?.length) {
        await tx.recolector_material.createMany({
          data: dto.materiales.map((m) => ({
            recolector_id: recolectorId,
            material_id: m.material_id,
            cantidad_mensual: m.cantidad_mensual,
            precio_venta: m.precio_venta,
            es_principal: m.es_principal ?? false,
          })),
        });
      }

      // 4. Tipos de generador
      if (dto.tipos_generador_ids?.length) {
        await tx.recolector_tipo_generador.createMany({
          data: dto.tipos_generador_ids.map((tipoId) => ({
            recolector_id: recolectorId,
            tipo_generador_id: tipoId,
          })),
        });
      }

      // 5. Return full recolector with all relations
      return tx.recolector.findUniqueOrThrow({
        where: { id: recolectorId },
        include: recolectorInclude,
      });
    });
  }

  async findAll(query: RecolectorQueryDto) {
    const where: Prisma.recolectorWhereInput = {
      activo: query.activo,
      zona_id: query.zona_id,
      acopiador_id: query.acopiador_id,
      asociacion_id: query.asociacion_id,
      genero: query.genero,
      trabaja_individual: query.trabaja_individual,
      ...(query.search
        ? { nombre_completo: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
      ...(query.material_id
        ? { recolector_material: { some: { material_id: query.material_id } } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.recolector.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre_completo: query.sortOrder },
        include: recolectorInclude,
      }),
      this.prisma.recolector.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findAllForMap() {
    return this.prisma.recolector.findMany({
      select: {
        id: true,
        nombre_completo: true,
        direccion_domicilio: true,
        latitud: true,
        longitud: true,
        activo: true,
        acopiador: { select: { nombre_completo: true } },
        zona: { select: { nombre: true } },
      },
      orderBy: { nombre_completo: 'asc' },
    });
  }

  async findOne(id: number) {
    const recolector = await this.prisma.recolector.findUnique({
      where: { id },
      include: recolectorInclude,
    });

    if (!recolector) throw new NotFoundException('Recolector no encontrado');
    return recolector;
  }

  async update(id: number, dto: UpdateRecolectorDto) {
    const recolector = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Extract relation arrays and activo from dto
      const { dias_trabajo, materiales, tipos_generador_ids, activo, ...recolectorData } = dto;

      // Update recolector fields if any
      if (Object.keys(recolectorData).length > 0) {
        await tx.recolector.update({
          where: { id },
          data: recolectorData,
        });
      }

      // Update activo in both tables
      if (activo !== undefined) {
        await tx.recolector.update({
          where: { id },
          data: { activo },
        });
        await tx.usuario.update({
          where: { id: recolector.usuario_id },
          data: { activo },
        });
      }

      // Replace días de trabajo if provided
      if (dias_trabajo !== undefined) {
        await tx.recolector_dia_trabajo.deleteMany({
          where: { recolector_id: id },
        });
        if (dias_trabajo.length > 0) {
          await tx.recolector_dia_trabajo.createMany({
            data: dias_trabajo.map((dia) => ({
              recolector_id: id,
              dia_semana: dia,
            })),
          });
        }
      }

      // Replace materiales if provided
      if (materiales !== undefined) {
        await tx.recolector_material.deleteMany({
          where: { recolector_id: id },
        });
        if (materiales.length > 0) {
          await tx.recolector_material.createMany({
            data: materiales.map((m) => ({
              recolector_id: id,
              material_id: m.material_id,
              cantidad_mensual: m.cantidad_mensual,
              precio_venta: m.precio_venta,
              es_principal: m.es_principal ?? false,
            })),
          });
        }
      }

      // Replace tipos generador if provided
      if (tipos_generador_ids !== undefined) {
        await tx.recolector_tipo_generador.deleteMany({
          where: { recolector_id: id },
        });
        if (tipos_generador_ids.length > 0) {
          await tx.recolector_tipo_generador.createMany({
            data: tipos_generador_ids.map((tipoId) => ({
              recolector_id: id,
              tipo_generador_id: tipoId,
            })),
          });
        }
      }

      return tx.recolector.findUniqueOrThrow({
        where: { id },
        include: recolectorInclude,
      });
    });
  }

  async hardDelete(id: number) {
    const recolector = await this.findOne(id);
    await this.prisma.usuario.delete({
      where: { id: recolector.usuario_id },
    });
  }
}
