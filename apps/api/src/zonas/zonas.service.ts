import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { CreateZonaDto, UpdateZonaDto, ZonaQueryDto } from './dto';

const ciudadInclude = {
  ciudad: {
    select: {
      id: true,
      nombre: true,
      departamento: { select: { id: true, nombre: true } },
    },
  },
} satisfies Prisma.zonaInclude;

@Injectable()
export class ZonasService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateZonaDto) {
    await this.ensureCiudadExiste(dto.ciudad_id);
    return this.prisma.zona.create({
      data: dto,
      include: ciudadInclude,
    });
  }

  async findAll(query: ZonaQueryDto) {
    const where: Prisma.zonaWhereInput = {
      activo: query.activo,
      ciudad_id: query.ciudad_id,
      ...(query.departamento_id !== undefined
        ? { ciudad: { departamento_id: query.departamento_id } }
        : {}),
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
        include: ciudadInclude,
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
        ciudad: {
          select: {
            id: true,
            nombre: true,
            departamento: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async findOne(id: number) {
    const zona = await this.prisma.zona.findUnique({
      where: { id },
      include: ciudadInclude,
    });
    if (!zona) throw new NotFoundException('Zona no encontrada');
    return zona;
  }

  async update(id: number, dto: UpdateZonaDto) {
    await this.findOne(id);
    if (dto.ciudad_id !== undefined) {
      await this.ensureCiudadExiste(dto.ciudad_id);
    }
    return this.prisma.zona.update({
      where: { id },
      data: dto,
      include: ciudadInclude,
    });
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    await this.prisma.zona.delete({ where: { id } });
  }

  private async ensureCiudadExiste(ciudad_id: number) {
    const ciudad = await this.prisma.ciudad.findUnique({
      where: { id: ciudad_id },
      select: { id: true },
    });
    if (!ciudad) {
      throw new NotFoundException('Ciudad no encontrada');
    }
  }
}
