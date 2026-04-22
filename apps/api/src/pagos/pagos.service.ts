import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, rol_usuario } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { ensureRecolectorPerteneceAlAcopiador } from '../common/auth';
import { CreatePagoDto, PagoQueryDto } from './dto';

const pagoInclude = {
  recolector: { select: { id: true, nombre_completo: true, cedula_identidad: true } },
  acopiador: { select: { id: true, nombre_completo: true, nombre_punto: true } },
  pago_transaccion: {
    include: {
      transaccion: {
        select: {
          id: true,
          fecha: true,
          monto_total: true,
          detalle_transaccion: {
            include: {
              material: { select: { id: true, nombre: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.pagoInclude;

@Injectable()
export class PagosService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registrar un pago. Solo el acopiador puede crear pagos.
   * Valida que todas las transacciones estén en ENTREGADO, pertenezcan
   * al recolector indicado y al acopiador logueado, y no tengan pago previo.
   */
  async create(dto: CreatePagoDto, userId: number) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Obtener el acopiador logueado
      const acopiador = await tx.acopiador.findFirst({
        where: { usuario_id: userId },
      });
      if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');

      // 2. Verificar que el recolector existe Y pertenece al acopiador.
      // Defensa en profundidad: aunque las validaciones por transacción
      // de abajo (acopiador_id de cada t === acopiador.id) ya bloquean
      // pagos a transacciones ajenas, este check evita que datos podridos
      // creados antes del fix del IDOR en transacciones se puedan pagar.
      await ensureRecolectorPerteneceAlAcopiador(
        tx,
        dto.recolector_id,
        acopiador.id,
      );

      // 3. Obtener todas las transacciones solicitadas
      const transacciones = await tx.transaccion.findMany({
        where: { id: { in: dto.transaccion_ids } },
        include: { pago_transaccion: true },
      });

      // 4. Validar que se encontraron todas
      if (transacciones.length !== dto.transaccion_ids.length) {
        const encontrados = transacciones.map((t) => t.id);
        const faltantes = dto.transaccion_ids.filter((id) => !encontrados.includes(id));
        throw new BadRequestException(
          `Transacciones no encontradas: ${faltantes.join(', ')}`,
        );
      }

      // 5. Validar cada transacción
      for (const t of transacciones) {
        if (t.estado !== 'ENTREGADO') {
          throw new BadRequestException(
            `La transacción #${t.id} no está en estado ENTREGADO (estado actual: ${t.estado})`,
          );
        }

        if (t.recolector_id !== dto.recolector_id) {
          throw new BadRequestException(
            `La transacción #${t.id} no pertenece al recolector seleccionado`,
          );
        }

        if (t.acopiador_id !== acopiador.id) {
          throw new ForbiddenException(
            `La transacción #${t.id} no pertenece a este acopiador`,
          );
        }

        if (t.pago_transaccion) {
          throw new BadRequestException(
            `La transacción #${t.id} ya fue pagada`,
          );
        }
      }

      // 6. Calcular monto total (el backend calcula, no confía en el frontend)
      const montoTotal = transacciones.reduce(
        (sum, t) => sum + Number(t.monto_total),
        0,
      );

      // 7. Crear el pago
      const pago = await tx.pago.create({
        data: {
          recolector_id: dto.recolector_id,
          acopiador_id: acopiador.id,
          monto_total: montoTotal,
          fecha_pago: new Date(),
          observaciones: dto.observaciones,
          pago_transaccion: {
            createMany: {
              data: dto.transaccion_ids.map((transaccion_id) => ({
                transaccion_id,
              })),
            },
          },
        },
        include: pagoInclude,
      });

      // 8. Actualizar estado de todas las transacciones a PAGADO
      await tx.transaccion.updateMany({
        where: { id: { in: dto.transaccion_ids } },
        data: { estado: 'PAGADO' },
      });

      // 9. Crear historial para cada transacción
      await tx.transaccion_historial.createMany({
        data: dto.transaccion_ids.map((transaccion_id) => ({
          transaccion_id,
          estado: 'PAGADO' as const,
          actor_id: userId,
          rol_actor: 'ACOPIADOR' as const,
          observaciones: dto.observaciones,
          detalles: { pago_id: pago.id, monto_total: montoTotal },
        })),
      });

      return pago;
    });
  }

  /**
   * Listar pagos con filtros. Filtra automáticamente por rol.
   */
  async findAll(query: PagoQueryDto, userId: number, userRol: rol_usuario) {
    const where: Prisma.pagoWhereInput = {};

    // Filtro por rol
    if (userRol === 'ACOPIADOR') {
      const acopiador = await this.prisma.acopiador.findFirst({
        where: { usuario_id: userId },
      });
      if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');
      where.acopiador_id = acopiador.id;
    } else if (userRol === 'RECOLECTOR') {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
      });
      if (!recolector) throw new ForbiddenException('Recolector no encontrado');
      where.recolector_id = recolector.id;
    }

    // Filtros opcionales (solo ADMIN puede filtrar por recolector/acopiador arbitrarios)
    if (userRol === 'ADMIN') {
      if (query.recolector_id) where.recolector_id = query.recolector_id;
      if (query.acopiador_id) where.acopiador_id = query.acopiador_id;
    }

    if (query.fecha_desde || query.fecha_hasta) {
      where.fecha_pago = {};
      if (query.fecha_desde) where.fecha_pago.gte = new Date(query.fecha_desde);
      if (query.fecha_hasta) where.fecha_pago.lte = new Date(query.fecha_hasta);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.pago.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { fecha_creacion: 'desc' },
        include: {
          recolector: { select: { id: true, nombre_completo: true } },
          acopiador: { select: { id: true, nombre_completo: true } },
          pago_transaccion: {
            select: { transaccion_id: true },
          },
        },
      }),
      this.prisma.pago.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  /**
   * Detalle de un pago con transacciones vinculadas.
   */
  async findOne(id: number, userId: number, userRol: rol_usuario) {
    const pago = await this.prisma.pago.findUnique({
      where: { id },
      include: pagoInclude,
    });

    if (!pago) throw new NotFoundException('Pago no encontrado');

    // Validar acceso por rol
    if (userRol === 'ACOPIADOR') {
      const acopiador = await this.prisma.acopiador.findFirst({
        where: { usuario_id: userId },
      });
      if (pago.acopiador_id !== acopiador?.id) {
        throw new ForbiddenException('No tiene acceso a este pago');
      }
    } else if (userRol === 'RECOLECTOR') {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
      });
      if (pago.recolector_id !== recolector?.id) {
        throw new ForbiddenException('No tiene acceso a este pago');
      }
    }

    return pago;
  }

  /**
   * Transacciones pendientes de pago para un recolector específico.
   * Solo el acopiador puede consultar esto.
   */
  async findPendientes(recolectorId: number, userId: number) {
    const acopiador = await this.prisma.acopiador.findFirst({
      where: { usuario_id: userId },
    });
    if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');

    // Verificar que el recolector existe y pertenece a este acopiador.
    // El helper devuelve el recolector si todo va bien, evitando un SELECT extra.
    const recolector = await ensureRecolectorPerteneceAlAcopiador(
      this.prisma,
      recolectorId,
      acopiador.id,
    );

    const transacciones = await this.prisma.transaccion.findMany({
      where: {
        recolector_id: recolectorId,
        acopiador_id: acopiador.id,
        estado: 'ENTREGADO',
        pago_transaccion: null,
      },
      orderBy: { fecha: 'asc' },
      include: {
        detalle_transaccion: {
          include: { material: { select: { id: true, nombre: true } } },
        },
        zona: { select: { id: true, nombre: true } },
      },
    });

    const totalPendiente = transacciones.reduce(
      (sum, t) => sum + Number(t.monto_total),
      0,
    );

    return {
      recolector: {
        id: recolector.id,
        nombre_completo: recolector.nombre_completo,
      },
      total_pendiente: totalPendiente,
      transacciones,
    };
  }
}
