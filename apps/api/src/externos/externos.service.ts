import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreateExternoDto,
  UpdateExternoDto,
  ExternoQueryDto,
} from './dto';

/**
 * Catálogo global de acopiadores/compradores externos al sistema.
 * Son destinos posibles de una transacción pero NO son usuarios:
 * no tienen login, no son centros operacionales, y nunca generan pagos en el sistema.
 *
 * Decisión del cliente: sin campo `tipo` (no sabemos qué tipo de comprador es cada uno).
 */
@Injectable()
export class ExternosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExternoDto) {
    return this.prisma.acopiador_comprador_externo.create({ data: dto });
  }

  async findAll(query: ExternoQueryDto) {
    const where: Prisma.acopiador_comprador_externoWhereInput = {
      activo: query.activo,
      ...(query.search
        ? {
            OR: [
              { nombre: { contains: query.search, mode: 'insensitive' as const } },
              { asociacion: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.acopiador_comprador_externo.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
      }),
      this.prisma.acopiador_comprador_externo.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const externo = await this.prisma.acopiador_comprador_externo.findUnique({
      where: { id },
    });
    if (!externo)
      throw new NotFoundException('Acopiador/Comprador externo no encontrado');
    return externo;
  }

  async update(id: number, dto: UpdateExternoDto) {
    await this.findOne(id);
    return this.prisma.acopiador_comprador_externo.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Elimina si no tiene transacciones asociadas; si las tiene, sugiere desactivar.
   * Solo `transaccion.acopiador_externo_id` referencia este catálogo en la BD.
   */
  async hardDelete(id: number) {
    await this.findOne(id);

    const transacciones = await this.prisma.transaccion.count({
      where: { acopiador_externo_id: id },
    });

    if (transacciones > 0) {
      throw new BadRequestException(
        `No se puede eliminar este acopiador/comprador externo porque tiene ` +
          `${transacciones} transacción(es) asociada(s). Desactívelo en su lugar.`,
      );
    }

    await this.prisma.acopiador_comprador_externo.delete({ where: { id } });
  }
}
