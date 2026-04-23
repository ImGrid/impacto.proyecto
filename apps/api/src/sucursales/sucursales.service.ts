import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, rol_usuario } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreateSucursalDto,
  UpdateSucursalDto,
  SucursalQueryDto,
  SucursalHorarioDto,
} from './dto';

// Convierte string "08:00" a Date con fecha base 1970-01-01 (Prisma Time)
function timeStringToDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

function mapHorarios(sucursalId: number, horarios: SucursalHorarioDto[]) {
  return horarios.map((h) => ({
    sucursal_id: sucursalId,
    dia_semana: h.dia_semana,
    hora_inicio: timeStringToDate(h.hora_inicio),
    hora_fin: timeStringToDate(h.hora_fin),
  }));
}

const sucursalInclude = {
  generador: {
    select: { id: true, razon_social: true },
  },
  zona: {
    select: { id: true, nombre: true },
  },
  sucursal_material: {
    include: { material: { select: { id: true, nombre: true } } },
  },
  sucursal_horario: {
    select: { id: true, dia_semana: true, hora_inicio: true, hora_fin: true },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.sucursalInclude;

@Injectable()
export class SucursalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSucursalDto) {
    const { materiales, horarios, ...sucursalData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const sucursal = await tx.sucursal.create({
        data: sucursalData,
      });

      if (materiales?.length) {
        await tx.sucursal_material.createMany({
          data: materiales.map((m) => ({
            sucursal_id: sucursal.id,
            material_id: m.material_id,
            cantidad_aproximada: m.cantidad_aproximada,
          })),
        });
      }

      if (horarios?.length) {
        await tx.sucursal_horario.createMany({
          data: mapHorarios(sucursal.id, horarios),
        });
      }

      return tx.sucursal.findUniqueOrThrow({
        where: { id: sucursal.id },
        include: sucursalInclude,
      });
    });
  }

  async findAll(
    query: SucursalQueryDto,
    userId?: number,
    userRol?: rol_usuario,
  ) {
    // Derivar/validar zona según el rol para evitar IDOR. ADMIN y GENERADOR
    // mantienen el comportamiento anterior (el GENERADOR ya se filtra
    // naturalmente por generador_id en sus consultas).
    let zonaIdFiltro = query.zona_id;

    if (userRol === 'RECOLECTOR' && userId != null) {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
        select: { zona_id: true },
      });
      if (!recolector) throw new ForbiddenException('Recolector no encontrado');
      // Si manda zona_id distinta a la suya, se rechaza. Si no manda, se
      // deriva automáticamente.
      if (query.zona_id != null && query.zona_id !== recolector.zona_id) {
        throw new ForbiddenException('No puede consultar sucursales de otras zonas');
      }
      zonaIdFiltro = recolector.zona_id;
    } else if (userRol === 'ACOPIADOR' && userId != null) {
      const acopiador = await this.prisma.acopiador.findFirst({
        where: { usuario_id: userId },
        select: { id: true, zona_id: true },
      });
      if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');

      if (query.zona_id == null) {
        // Sin zona explícita: por defecto su propia zona.
        zonaIdFiltro = acopiador.zona_id;
      } else if (query.zona_id !== acopiador.zona_id) {
        // Puede consultar otras zonas solo si tiene al menos un recolector
        // asignado ahí (caso acopiador móvil con recolectores en zonas
        // distintas a la suya).
        const recolectorEnZona = await this.prisma.recolector.findFirst({
          where: { acopiador_id: acopiador.id, zona_id: query.zona_id },
          select: { id: true },
        });
        if (!recolectorEnZona) {
          throw new ForbiddenException(
            'No tiene recolectores asignados en esa zona',
          );
        }
      }
    }

    const where: Prisma.sucursalWhereInput = {
      activo: query.activo,
      generador_id: query.generador_id,
      zona_id: zonaIdFiltro,
      frecuencia: query.frecuencia,
      ...(query.search
        ? { nombre: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sucursal.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
        include: sucursalInclude,
      }),
      this.prisma.sucursal.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      include: sucursalInclude,
    });

    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');
    return sucursal;
  }

  async update(id: number, dto: UpdateSucursalDto) {
    await this.findOne(id);

    const { materiales, horarios, ...sucursalData } = dto;

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(sucursalData).length > 0) {
        await tx.sucursal.update({
          where: { id },
          data: sucursalData,
        });
      }

      if (materiales !== undefined) {
        await tx.sucursal_material.deleteMany({
          where: { sucursal_id: id },
        });
        if (materiales.length > 0) {
          await tx.sucursal_material.createMany({
            data: materiales.map((m) => ({
              sucursal_id: id,
              material_id: m.material_id,
              cantidad_aproximada: m.cantidad_aproximada,
            })),
          });
        }
      }

      if (horarios !== undefined) {
        await tx.sucursal_horario.deleteMany({
          where: { sucursal_id: id },
        });
        if (horarios.length > 0) {
          await tx.sucursal_horario.createMany({
            data: mapHorarios(id, horarios),
          });
        }
      }

      return tx.sucursal.findUniqueOrThrow({
        where: { id },
        include: sucursalInclude,
      });
    });
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    await this.prisma.sucursal.delete({ where: { id } });
  }

  /**
   * Actualizar horarios de una sucursal.
   * El generador solo puede modificar horarios de sus propias sucursales.
   */
  async updateHorarios(id: number, horarios: SucursalHorarioDto[], userId: number) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      include: { generador: { select: { usuario_id: true } } },
    });

    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

    if (sucursal.generador.usuario_id !== userId) {
      throw new ForbiddenException('Esta sucursal no pertenece a su empresa');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.sucursal_horario.deleteMany({ where: { sucursal_id: id } });

      if (horarios.length > 0) {
        await tx.sucursal_horario.createMany({
          data: mapHorarios(id, horarios),
        });
      }

      return tx.sucursal.findUniqueOrThrow({
        where: { id },
        include: sucursalInclude,
      });
    });
  }
}
