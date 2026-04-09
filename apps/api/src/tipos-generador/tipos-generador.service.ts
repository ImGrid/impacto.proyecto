import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreateTipoGeneradorDto,
  UpdateTipoGeneradorDto,
  TipoGeneradorQueryDto,
} from './dto';

@Injectable()
export class TiposGeneradorService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTipoGeneradorDto) {
    return this.prisma.tipo_generador.create({ data: dto });
  }

  async findAll(query: TipoGeneradorQueryDto) {
    const where: Prisma.tipo_generadorWhereInput = {
      activo: query.activo,
      ...(query.search
        ? { nombre: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.tipo_generador.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
      }),
      this.prisma.tipo_generador.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const tipoGenerador = await this.prisma.tipo_generador.findUnique({
      where: { id },
    });
    if (!tipoGenerador)
      throw new NotFoundException('Tipo de generador no encontrado');
    return tipoGenerador;
  }

  async update(id: number, dto: UpdateTipoGeneradorDto) {
    await this.findOne(id);
    return this.prisma.tipo_generador.update({ where: { id }, data: dto });
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    await this.prisma.tipo_generador.delete({ where: { id } });
  }
}
