import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { DepartamentoQueryDto } from './dto';

@Injectable()
export class DepartamentosService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: DepartamentoQueryDto) {
    const where: Prisma.departamentoWhereInput = {
      activo: query.activo,
      ...(query.search
        ? { nombre: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.departamento.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
      }),
      this.prisma.departamento.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const departamento = await this.prisma.departamento.findUnique({
      where: { id },
    });
    if (!departamento) throw new NotFoundException('Departamento no encontrado');
    return departamento;
  }
}
