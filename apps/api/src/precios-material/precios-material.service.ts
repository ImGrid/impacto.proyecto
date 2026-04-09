import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreatePrecioMaterialDto,
  UpdatePrecioMaterialDto,
  PrecioMaterialQueryDto,
} from './dto';

type EstadoPrecio = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO';

@Injectable()
export class PreciosMaterialService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePrecioMaterialDto) {
    // Validar que precio_maximo >= precio_minimo
    if (dto.precio_maximo < dto.precio_minimo) {
      throw new BadRequestException(
        'El precio máximo debe ser mayor o igual al precio mínimo',
      );
    }

    const fechaInicio = new Date(dto.fecha_inicio);
    const fechaFin = dto.fecha_fin ? new Date(dto.fecha_fin) : null;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Validar que fecha_inicio no sea futura (no hay precios programados)
    if (fechaInicio > hoy) {
      throw new BadRequestException(
        'La fecha de inicio no puede ser futura',
      );
    }

    // Validar que fecha_fin >= fecha_inicio (si se proporcionó)
    if (fechaFin && fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      );
    }

    // Verificar que el material existe
    const material = await this.prisma.material.findUnique({
      where: { id: dto.material_id },
    });
    if (!material) {
      throw new NotFoundException('Material no encontrado');
    }

    return this.prisma.$transaction(async (tx) => {
      // Buscar precio vigente actual (fecha_fin IS NULL) para este material
      const precioVigente = await tx.precio_material.findFirst({
        where: {
          material_id: dto.material_id,
          fecha_fin: null,
        },
      });

      if (precioVigente) {
        // Validar que la nueva fecha_inicio sea posterior a la del vigente
        if (fechaInicio <= precioVigente.fecha_inicio) {
          throw new ConflictException(
            'La fecha de inicio debe ser posterior a la fecha de inicio del precio vigente actual',
          );
        }

        // Cerrar el precio vigente anterior (fecha_fin = nuevo.fecha_inicio - 1 día)
        const diaAnterior = new Date(fechaInicio);
        diaAnterior.setDate(diaAnterior.getDate() - 1);

        await tx.precio_material.update({
          where: { id: precioVigente.id },
          data: { fecha_fin: diaAnterior },
        });
      }

      // Crear el nuevo precio
      return tx.precio_material.create({
        data: {
          material_id: dto.material_id,
          precio_minimo: dto.precio_minimo,
          precio_maximo: dto.precio_maximo,
          fecha_inicio: fechaInicio,
          fecha_fin: fechaFin,
        },
        include: {
          material: { select: { id: true, nombre: true, unidad_medida_default: true } },
        },
      });
    });
  }

  async findAll(query: PrecioMaterialQueryDto) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const where: Prisma.precio_materialWhereInput = {};

    // Filtro por material_id
    if (query.material_id) {
      where.material_id = query.material_id;
    }

    // Filtro por búsqueda en nombre del material
    if (query.search) {
      where.material = {
        nombre: { contains: query.search, mode: 'insensitive' as const },
      };
    }

    // Filtro por vigencia
    const vigencia = query.vigencia ?? 'vigentes';
    if (vigencia === 'vigentes') {
      where.fecha_inicio = { lte: hoy };
      where.OR = [{ fecha_fin: null }, { fecha_fin: { gte: hoy } }];
    } else if (vigencia === 'vencidos') {
      where.fecha_fin = { lt: hoy, not: null };
    }
    // 'todos' no agrega filtro de fechas

    const [data, total] = await this.prisma.$transaction([
      this.prisma.precio_material.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: [
          { material: { nombre: query.sortOrder } },
          { fecha_inicio: 'desc' },
        ],
        include: {
          material: { select: { id: true, nombre: true, unidad_medida_default: true } },
        },
      }),
      this.prisma.precio_material.count({ where }),
    ]);

    // Agregar estado calculado a cada registro
    const dataConEstado = data.map((p) => ({
      ...p,
      estado: this.calcularEstado(p.fecha_inicio, p.fecha_fin),
    }));

    return new PaginatedResponseDto(
      dataConEstado,
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: number) {
    const precio = await this.prisma.precio_material.findUnique({
      where: { id },
      include: {
        material: { select: { id: true, nombre: true, unidad_medida_default: true } },
      },
    });
    if (!precio) {
      throw new NotFoundException('Precio de material no encontrado');
    }
    return {
      ...precio,
      estado: this.calcularEstado(precio.fecha_inicio, precio.fecha_fin),
    };
  }

  async update(id: number, dto: UpdatePrecioMaterialDto) {
    const precio = await this.findOne(id);

    // Solo se pueden editar precios vigentes
    if (precio.estado === 'VENCIDO') {
      throw new ForbiddenException(
        'No se puede editar un precio vencido',
      );
    }

    // Validar precio_maximo >= precio_minimo considerando valores parciales
    const precioMin = dto.precio_minimo ?? Number(precio.precio_minimo);
    const precioMax = dto.precio_maximo ?? Number(precio.precio_maximo);
    if (precioMax < precioMin) {
      throw new BadRequestException(
        'El precio máximo debe ser mayor o igual al precio mínimo',
      );
    }

    // Validar fechas si se proporcionan
    const fechaInicio = dto.fecha_inicio
      ? new Date(dto.fecha_inicio)
      : precio.fecha_inicio;
    const fechaFin =
      dto.fecha_fin === null
        ? null
        : dto.fecha_fin
          ? new Date(dto.fecha_fin)
          : precio.fecha_fin;

    if (fechaFin && fechaFin < fechaInicio) {
      throw new BadRequestException(
        'La fecha de fin debe ser igual o posterior a la fecha de inicio',
      );
    }

    const data: Prisma.precio_materialUpdateInput = {};
    if (dto.precio_minimo !== undefined) data.precio_minimo = dto.precio_minimo;
    if (dto.precio_maximo !== undefined) data.precio_maximo = dto.precio_maximo;
    if (dto.fecha_inicio !== undefined) data.fecha_inicio = new Date(dto.fecha_inicio);
    if (dto.fecha_fin !== undefined) data.fecha_fin = dto.fecha_fin ? new Date(dto.fecha_fin) : null;

    const updated = await this.prisma.precio_material.update({
      where: { id },
      data,
      include: {
        material: { select: { id: true, nombre: true, unidad_medida_default: true } },
      },
    });

    return {
      ...updated,
      estado: this.calcularEstado(updated.fecha_inicio, updated.fecha_fin),
    };
  }

  async hardDelete(id: number) {
    const precio = await this.findOne(id);

    // No se pueden eliminar precios vencidos (son historial)
    if (precio.estado === 'VENCIDO') {
      throw new ForbiddenException(
        'No se puede eliminar un precio vencido porque forma parte del historial',
      );
    }

    await this.prisma.precio_material.delete({ where: { id } });
  }

  private calcularEstado(
    fechaInicio: Date,
    fechaFin: Date | null,
  ): EstadoPrecio {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaFin) {
      const fin = new Date(fechaFin);
      fin.setHours(0, 0, 0, 0);

      if (fin < hoy) return 'VENCIDO';

      // Por vencer: faltan 7 días o menos
      const diffMs = fin.getTime() - hoy.getTime();
      const diffDias = diffMs / (1000 * 60 * 60 * 24);
      if (diffDias <= 7) return 'POR_VENCER';
    }

    return 'VIGENTE';
  }
}
