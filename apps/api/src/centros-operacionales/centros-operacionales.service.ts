import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { normalizarCI } from '../common/helpers';
import { ensureZonaEnDepartamento } from '../common/auth/zona-departamento.helper';
import {
  CreateCentroOperacionalDto,
  UpdateCentroOperacionalDto,
  CentroOperacionalQueryDto,
} from './dto';

const centroInclude = {
  usuario: { select: { email: true, activo: true } },
  zona: { select: { id: true, nombre: true } },
  departamento: { select: { id: true, nombre: true } },
} satisfies Prisma.centro_operacionalInclude;

@Injectable()
export class CentrosOperacionalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateCentroOperacionalDto,
    departamentoActivo: number | null,
  ) {
    // Filtro global por depto: el centro op se crea dentro del depto activo.
    if (
      departamentoActivo != null &&
      dto.departamento_id !== departamentoActivo
    ) {
      throw new BadRequestException(
        'El centro operacional debe crearse en el departamento activo de la sesión',
      );
    }

    // La zona elegida debe pertenecer al departamento del centro operacional
    // (coherencia del departamento_id denormalizado — doc 19 §5.2).
    await ensureZonaEnDepartamento(
      this.prisma,
      dto.zona_id,
      dto.departamento_id,
    );

    const password_hash = await argon2.hash(dto.password);

    return this.prisma.usuario.create({
      data: {
        email: dto.email,
        identificador: dto.email,
        password_hash,
        rol: 'ACOPIADOR',
        centro_operacional: {
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
            departamento_id: dto.departamento_id,
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
        centro_operacional: true,
      },
    });
  }

  async findAll(
    query: CentroOperacionalQueryDto,
    departamentoActivo: number | null,
  ) {
    const where: Prisma.centro_operacionalWhereInput = {
      activo: query.activo,
      zona_id: query.zona_id,
      tipo_acopio: query.tipo_acopio,
      // Filtro global por departamento activo.
      ...(departamentoActivo != null
        ? { departamento_id: departamentoActivo }
        : query.departamento_id != null
        ? { departamento_id: query.departamento_id }
        : {}),
      ...(query.search
        ? { nombre_completo: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.centro_operacional.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre_completo: query.sortOrder },
        include: centroInclude,
      }),
      this.prisma.centro_operacional.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findAllForMap(departamentoActivo: number | null) {
    return this.prisma.centro_operacional.findMany({
      where: {
        ...(departamentoActivo != null
          ? { departamento_id: departamentoActivo }
          : {}),
      },
      select: {
        id: true,
        nombre_completo: true,
        nombre_punto: true,
        tipo_acopio: true,
        latitud: true,
        longitud: true,
        activo: true,
        zona: { select: { nombre: true } },
        departamento: { select: { nombre: true } },
      },
      orderBy: { nombre_completo: 'asc' },
    });
  }

  async findOne(id: number, departamentoActivo: number | null) {
    const centro = await this.prisma.centro_operacional.findUnique({
      where: { id },
      include: centroInclude,
    });

    if (!centro) {
      throw new NotFoundException('Centro operacional no encontrado');
    }

    // Scope por departamento activo.
    if (
      departamentoActivo != null &&
      centro.departamento_id !== departamentoActivo
    ) {
      throw new NotFoundException('Centro operacional no encontrado');
    }

    return centro;
  }

  async update(
    id: number,
    dto: UpdateCentroOperacionalDto,
    departamentoActivo: number | null,
  ) {
    const centro = await this.findOne(id, departamentoActivo);
    const { activo, ...centroData } = dto;

    if (
      departamentoActivo != null &&
      centroData.departamento_id !== undefined &&
      centroData.departamento_id !== departamentoActivo
    ) {
      throw new BadRequestException(
        'No se puede mover el centro operacional a otro departamento desde esta sesión',
      );
    }

    // Si cambia la zona y/o el departamento, deben seguir siendo coherentes
    // entre sí (zona -> ciudad -> departamento).
    if (
      centroData.zona_id !== undefined ||
      centroData.departamento_id !== undefined
    ) {
      await ensureZonaEnDepartamento(
        this.prisma,
        centroData.zona_id ?? centro.zona_id,
        centroData.departamento_id ?? centro.departamento_id,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(centroData).length > 0) {
        await tx.centro_operacional.update({
          where: { id },
          data: centroData,
        });
      }

      if (activo !== undefined) {
        await tx.centro_operacional.update({
          where: { id },
          data: { activo },
        });
        await tx.usuario.update({
          where: { id: centro.usuario_id },
          data: { activo },
        });
      }

      return tx.centro_operacional.findUniqueOrThrow({
        where: { id },
        include: centroInclude,
      });
    });
  }

  async hardDelete(id: number, departamentoActivo: number | null) {
    const centro = await this.findOne(id, departamentoActivo);
    await this.prisma.usuario.delete({
      where: { id: centro.usuario_id },
    });
  }
}
