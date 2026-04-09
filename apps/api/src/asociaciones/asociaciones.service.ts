import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreateAsociacionDto,
  UpdateAsociacionDto,
  AsociacionQueryDto,
} from './dto';

@Injectable()
export class AsociacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAsociacionDto) {
    return this.prisma.asociacion.create({ data: dto });
  }

  async findAll(query: AsociacionQueryDto) {
    const where: Prisma.asociacionWhereInput = {
      activo: query.activo,
      ...(query.search
        ? { nombre: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.asociacion.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
      }),
      this.prisma.asociacion.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const asociacion = await this.prisma.asociacion.findUnique({
      where: { id },
    });
    if (!asociacion) throw new NotFoundException('Asociación no encontrada');
    return asociacion;
  }

  async update(id: number, dto: UpdateAsociacionDto) {
    await this.findOne(id);
    return this.prisma.asociacion.update({ where: { id }, data: dto });
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    await this.prisma.asociacion.delete({ where: { id } });
  }
}
