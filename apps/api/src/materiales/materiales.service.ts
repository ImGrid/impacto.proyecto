import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { CreateMaterialDto, UpdateMaterialDto, MaterialQueryDto } from './dto';

@Injectable()
export class MaterialesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialDto, departamentoActivo: number | null) {
    // El material se crea en el departamento activo de la sesión. El cliente
    // no lo envía: lo determina el JWT. Un admin global elige su departamento
    // activo al entrar, así que siempre llega seteado.
    if (departamentoActivo == null) {
      throw new BadRequestException(
        'Debe seleccionar un departamento para crear materiales',
      );
    }
    return this.prisma.material.create({
      data: { ...dto, departamento_id: departamentoActivo },
    });
  }

  async findAll(query: MaterialQueryDto, departamentoActivo: number | null) {
    // Los roles con departamento fijo en el JWT (admin/recolector/centro op)
    // ven solo los materiales de su departamento activo. El GENERADOR llega
    // con departamento_activo = null y puede pedir un departamento concreto
    // (el de su sucursal) vía query.departamento_id.
    const deptoFiltro = departamentoActivo ?? query.departamento_id ?? null;

    const where: Prisma.materialWhereInput = {
      activo: query.activo,
      ...(deptoFiltro != null ? { departamento_id: deptoFiltro } : {}),
      ...(query.search
        ? { nombre: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.material.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
      }),
      this.prisma.material.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number, departamentoActivo: number | null) {
    const material = await this.prisma.material.findUnique({
      where: { id },
    });
    if (!material) throw new NotFoundException('Material no encontrado');

    // Scope por departamento activo: si el material es de otro departamento,
    // desde la vista del caller no existe.
    if (
      departamentoActivo != null &&
      material.departamento_id !== departamentoActivo
    ) {
      throw new NotFoundException('Material no encontrado');
    }

    return material;
  }

  async update(
    id: number,
    dto: UpdateMaterialDto,
    departamentoActivo: number | null,
  ) {
    // findOne aplica el scope por depto (404 si es de otro departamento).
    await this.findOne(id, departamentoActivo);
    return this.prisma.material.update({ where: { id }, data: dto });
  }

  async hardDelete(id: number, departamentoActivo: number | null) {
    await this.findOne(id, departamentoActivo);
    await this.prisma.material.delete({ where: { id } });
  }
}
