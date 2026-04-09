import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { CreateZonaDto, UpdateZonaDto, ZonaQueryDto } from './dto';

@Injectable()
export class ZonasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateZonaDto) {
    return this.prisma.zona.create({ data: dto });
  }

  async findAll(query: ZonaQueryDto) {
    const where: Prisma.zonaWhereInput = {
      activo: query.activo,
      ...(query.search
        ? { nombre: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.zona.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
      }),
      this.prisma.zona.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findAllForMap() {
    return this.prisma.zona.findMany({
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        latitud: true,
        longitud: true,
        radio_km: true,
        activo: true,
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const zona = await this.prisma.zona.findUnique({
      where: { id },
    });
    if (!zona) throw new NotFoundException('Zona no encontrada');
    return zona;
  }

  async update(id: number, dto: UpdateZonaDto) {
    await this.findOne(id);
    return this.prisma.zona.update({ where: { id }, data: dto });
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    await this.prisma.zona.delete({ where: { id } });
  }
}
