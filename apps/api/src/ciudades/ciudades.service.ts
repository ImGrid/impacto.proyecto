import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreateCiudadDto,
  UpdateCiudadDto,
  CiudadQueryDto,
} from './dto';

@Injectable()
export class CiudadesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCiudadDto) {
    await this.ensureDepartamentoExiste(dto.departamento_id);
    return this.prisma.ciudad.create({
      data: dto,
      include: { departamento: { select: { id: true, nombre: true } } },
    });
  }

  async findAll(query: CiudadQueryDto) {
    const where: Prisma.ciudadWhereInput = {
      activo: query.activo,
      departamento_id: query.departamento_id,
      ...(query.search
        ? { nombre: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ciudad.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
        include: { departamento: { select: { id: true, nombre: true } } },
      }),
      this.prisma.ciudad.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const ciudad = await this.prisma.ciudad.findUnique({
      where: { id },
      include: { departamento: { select: { id: true, nombre: true } } },
    });
    if (!ciudad) throw new NotFoundException('Ciudad no encontrada');
    return ciudad;
  }

  async update(id: number, dto: UpdateCiudadDto) {
    await this.findOne(id);
    if (dto.departamento_id !== undefined) {
      await this.ensureDepartamentoExiste(dto.departamento_id);
    }
    return this.prisma.ciudad.update({
      where: { id },
      data: dto,
      include: { departamento: { select: { id: true, nombre: true } } },
    });
  }

  async hardDelete(id: number) {
    await this.findOne(id);

    const zonas = await this.prisma.zona.count({ where: { ciudad_id: id } });
    if (zonas > 0) {
      throw new BadRequestException(
        `No se puede eliminar esta ciudad porque tiene ${zonas} zona(s) asociada(s). ` +
          `Desactívela en su lugar.`,
      );
    }

    await this.prisma.ciudad.delete({ where: { id } });
  }

  private async ensureDepartamentoExiste(departamento_id: number) {
    const departamento = await this.prisma.departamento.findUnique({
      where: { id: departamento_id },
      select: { id: true },
    });
    if (!departamento) {
      throw new NotFoundException('Departamento no encontrado');
    }
  }
}
