import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { CreateMaterialDto, UpdateMaterialDto, MaterialQueryDto } from './dto';

@Injectable()
export class MaterialesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMaterialDto) {
    return this.prisma.material.create({ data: dto });
  }

  async findAll(query: MaterialQueryDto) {
    const where: Prisma.materialWhereInput = {
      activo: query.activo,
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

  async findOne(id: number) {
    const material = await this.prisma.material.findUnique({
      where: { id },
    });
    if (!material) throw new NotFoundException('Material no encontrado');
    return material;
  }

  async update(id: number, dto: UpdateMaterialDto) {
    await this.findOne(id);
    return this.prisma.material.update({ where: { id }, data: dto });
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    await this.prisma.material.delete({ where: { id } });
  }
}
