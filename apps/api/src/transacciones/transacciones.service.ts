import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, estado_transaccion, rol_usuario } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import {
  CreateTransaccionDto,
  UpdateTransaccionDto,
  TransaccionQueryDto,
} from './dto';

// Relaciones que siempre se cargan al consultar transacciones
const transaccionInclude = {
  recolector: { select: { id: true, nombre_completo: true, cedula_identidad: true } },
  acopiador: { select: { id: true, nombre_completo: true, nombre_punto: true } },
  sucursal: {
    select: {
      id: true,
      nombre: true,
      generador: { select: { id: true, razon_social: true } },
    },
  },
  zona: { select: { id: true, nombre: true } },
  detalle_transaccion: {
    include: {
      material: { select: { id: true, nombre: true, unidad_medida_default: true } },
    },
  },
  transaccion_historial: {
    orderBy: { fecha: 'asc' as const },
    include: {
      usuario: { select: { id: true, identificador: true, rol: true } },
    },
  },
  usuario: { select: { id: true, identificador: true, rol: true } },
} satisfies Prisma.transaccionInclude;

// Transiciones de estado válidas
const TRANSICIONES_VALIDAS: Record<string, estado_transaccion[]> = {
  GENERADO: ['RECOLECTADO', 'ENTREGADO'],
  RECOLECTADO: ['ENTREGADO'],
  ENTREGADO: ['PAGADO'],
};

@Injectable()
export class TransaccionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear transacción. El estado se determina por el rol del creador:
   * - GENERADOR → GENERADO (recolector_id y acopiador_id quedan null)
   * - RECOLECTOR → RECOLECTADO (acopiador_id se hereda de su asignación)
   * - ACOPIADOR → ENTREGADO (transacción completa en un paso)
   */
  async create(
    dto: CreateTransaccionDto,
    userId: number,
    userRol: rol_usuario,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let estado: estado_transaccion;
      let recolectorId: number | null = null;
      let acopiadorId: number | null = null;
      let zonaId: number;

      if (userRol === 'GENERADOR') {
        estado = 'GENERADO';

        // El generador debe indicar sucursal
        if (!dto.sucursal_id) {
          throw new BadRequestException('La sucursal es obligatoria para el generador');
        }

        // Obtener zona de la sucursal y verificar que pertenece al generador
        const generador = await tx.generador.findFirst({
          where: { usuario_id: userId },
        });
        if (!generador) throw new ForbiddenException('Generador no encontrado');

        const sucursal = await tx.sucursal.findFirst({
          where: { id: dto.sucursal_id, generador_id: generador.id },
        });
        if (!sucursal) throw new BadRequestException('La sucursal no pertenece a este generador');

        zonaId = sucursal.zona_id;

      } else if (userRol === 'RECOLECTOR') {
        estado = 'RECOLECTADO';

        const recolector = await tx.recolector.findFirst({
          where: { usuario_id: userId },
        });
        if (!recolector) throw new ForbiddenException('Recolector no encontrado');

        recolectorId = recolector.id;
        acopiadorId = recolector.acopiador_id;
        zonaId = dto.zona_id ?? recolector.zona_id;

      } else if (userRol === 'ACOPIADOR') {
        estado = 'ENTREGADO';

        const acopiador = await tx.acopiador.findFirst({
          where: { usuario_id: userId },
        });
        if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');

        if (!dto.recolector_id) {
          throw new BadRequestException('El recolector es obligatorio para el acopiador');
        }

        // Verificar que el recolector existe
        const recolector = await tx.recolector.findUnique({
          where: { id: dto.recolector_id },
        });
        if (!recolector) throw new BadRequestException('Recolector no encontrado');

        recolectorId = dto.recolector_id;
        acopiadorId = acopiador.id;
        zonaId = dto.zona_id ?? acopiador.zona_id;

      } else {
        throw new ForbiddenException('Rol no permitido para crear transacciones');
      }

      // Calcular subtotales y monto total
      const detallesConSubtotal = dto.detalles.map((d) => ({
        material_id: d.material_id,
        cantidad: d.cantidad,
        unidad_medida: d.unidad_medida,
        precio_unitario: d.precio_unitario ?? 0,
        subtotal: d.cantidad * (d.precio_unitario ?? 0),
      }));

      const montoTotal = detallesConSubtotal.reduce((sum, d) => sum + d.subtotal, 0);

      const now = new Date();

      // Crear transacción + detalles + historial en una sola operación
      const transaccion = await tx.transaccion.create({
        data: {
          fecha: now,
          hora: now,
          recolector_id: recolectorId,
          acopiador_id: acopiadorId,
          sucursal_id: dto.sucursal_id,
          zona_id: zonaId,
          monto_total: montoTotal,
          observaciones: dto.observaciones,
          estado,
          creado_por_id: userId,
          detalle_transaccion: {
            createMany: { data: detallesConSubtotal },
          },
          transaccion_historial: {
            create: {
              estado,
              actor_id: userId,
              rol_actor: userRol,
              observaciones: dto.observaciones,
              detalles: {
                materiales: dto.detalles.map((d) => ({
                  material_id: d.material_id,
                  cantidad: d.cantidad,
                  unidad_medida: d.unidad_medida,
                  precio_unitario: d.precio_unitario,
                })),
              },
            },
          },
        },
        include: transaccionInclude,
      });

      return transaccion;
    });
  }

  /**
   * Actualizar transacción (avanzar estado).
   * Valida transiciones permitidas y permisos por rol.
   */
  async update(
    id: number,
    dto: UpdateTransaccionDto,
    userId: number,
    userRol: rol_usuario,
  ) {
    const transaccion = await this.prisma.transaccion.findUnique({
      where: { id },
    });

    if (!transaccion) throw new NotFoundException('Transacción no encontrada');

    // Validar transición de estado
    const permitidas = TRANSICIONES_VALIDAS[transaccion.estado];
    if (!permitidas || !permitidas.includes(dto.estado)) {
      throw new BadRequestException(
        `No se puede cambiar de ${transaccion.estado} a ${dto.estado}`,
      );
    }

    // Validar permisos por rol
    if (dto.estado === 'RECOLECTADO' && userRol !== 'RECOLECTOR') {
      throw new ForbiddenException('Solo un recolector puede marcar como RECOLECTADO');
    }
    if (dto.estado === 'ENTREGADO' && userRol !== 'ACOPIADOR') {
      throw new ForbiddenException('Solo un acopiador puede marcar como ENTREGADO');
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.transaccionUpdateInput = {
        estado: dto.estado,
        observaciones: dto.observaciones ?? transaccion.observaciones,
      };

      // Si es recolector tomando una transacción GENERADO
      if (dto.estado === 'RECOLECTADO') {
        const recolector = await tx.recolector.findFirst({
          where: { usuario_id: userId },
        });
        if (!recolector) throw new ForbiddenException('Recolector no encontrado');

        updateData.recolector = { connect: { id: recolector.id } };
        updateData.acopiador = { connect: { id: recolector.acopiador_id } };
      }

      // Si es acopiador completando la transacción
      if (dto.estado === 'ENTREGADO') {
        const acopiador = await tx.acopiador.findFirst({
          where: { usuario_id: userId },
        });
        if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');

        updateData.acopiador = { connect: { id: acopiador.id } };
      }

      // Si vienen detalles nuevos, reemplazar los existentes
      if (dto.detalles?.length) {
        const detallesConSubtotal = dto.detalles.map((d) => ({
          material_id: d.material_id,
          cantidad: d.cantidad,
          unidad_medida: d.unidad_medida,
          precio_unitario: d.precio_unitario ?? 0,
          subtotal: d.cantidad * (d.precio_unitario ?? 0),
        }));

        const montoTotal = detallesConSubtotal.reduce((sum, d) => sum + d.subtotal, 0);
        updateData.monto_total = montoTotal;

        // Borrar detalles anteriores y crear nuevos
        await tx.detalle_transaccion.deleteMany({
          where: { transaccion_id: id },
        });

        await tx.detalle_transaccion.createMany({
          data: detallesConSubtotal.map((d) => ({
            transaccion_id: id,
            ...d,
          })),
        });
      }

      // Actualizar la transacción
      await tx.transaccion.update({
        where: { id },
        data: updateData,
      });

      // Crear registro en historial
      await tx.transaccion_historial.create({
        data: {
          transaccion_id: id,
          estado: dto.estado,
          actor_id: userId,
          rol_actor: userRol,
          observaciones: dto.observaciones,
          detalles: dto.detalles?.length
            ? {
                materiales: dto.detalles.map((d) => ({
                  material_id: d.material_id,
                  cantidad: d.cantidad,
                  unidad_medida: d.unidad_medida,
                  precio_unitario: d.precio_unitario,
                })),
              }
            : undefined,
        },
      });

      // Retornar transacción actualizada con todas las relaciones
      return tx.transaccion.findUniqueOrThrow({
        where: { id },
        include: transaccionInclude,
      });
    });
  }

  /**
   * Listar transacciones con filtros. Filtra automáticamente por rol:
   * - ADMIN: ve todas
   * - ACOPIADOR: ve las de sus recolectores asignados
   * - RECOLECTOR: ve solo las suyas
   * - GENERADOR: ve las de sus sucursales
   */
  async findAll(
    query: TransaccionQueryDto,
    userId: number,
    userRol: rol_usuario,
  ) {
    const where: Prisma.transaccionWhereInput = {};

    // Filtro por rol (seguridad)
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
    } else if (userRol === 'GENERADOR') {
      const generador = await this.prisma.generador.findFirst({
        where: { usuario_id: userId },
        include: { sucursal: { select: { id: true } } },
      });
      if (!generador) throw new ForbiddenException('Generador no encontrado');
      const sucursalIds = generador.sucursal.map((s) => s.id);
      where.sucursal_id = { in: sucursalIds };
    }
    // ADMIN: sin filtro adicional

    // Filtros opcionales del query
    if (query.estado) where.estado = query.estado;
    if (query.recolector_id) where.recolector_id = query.recolector_id;
    if (query.acopiador_id) where.acopiador_id = query.acopiador_id;
    if (query.zona_id) where.zona_id = query.zona_id;

    if (query.fecha_desde || query.fecha_hasta) {
      where.fecha = {};
      if (query.fecha_desde) where.fecha.gte = new Date(query.fecha_desde);
      if (query.fecha_hasta) where.fecha.lte = new Date(query.fecha_hasta);
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.transaccion.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { fecha_creacion: 'desc' },
        include: {
          recolector: { select: { id: true, nombre_completo: true } },
          acopiador: { select: { id: true, nombre_completo: true, nombre_punto: true } },
          zona: { select: { id: true, nombre: true } },
          detalle_transaccion: {
            include: { material: { select: { id: true, nombre: true } } },
          },
        },
      }),
      this.prisma.transaccion.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  /**
   * Detalle de una transacción con historial completo.
   * Valida que el usuario tenga acceso según su rol.
   */
  async findOne(id: number, userId: number, userRol: rol_usuario) {
    const transaccion = await this.prisma.transaccion.findUnique({
      where: { id },
      include: transaccionInclude,
    });

    if (!transaccion) throw new NotFoundException('Transacción no encontrada');

    // Validar acceso por rol
    if (userRol === 'RECOLECTOR') {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
      });
      if (transaccion.recolector_id !== recolector?.id) {
        throw new ForbiddenException('No tiene acceso a esta transacción');
      }
    } else if (userRol === 'ACOPIADOR') {
      const acopiador = await this.prisma.acopiador.findFirst({
        where: { usuario_id: userId },
      });
      if (transaccion.acopiador_id !== acopiador?.id) {
        throw new ForbiddenException('No tiene acceso a esta transacción');
      }
    } else if (userRol === 'GENERADOR') {
      const generador = await this.prisma.generador.findFirst({
        where: { usuario_id: userId },
        include: { sucursal: { select: { id: true } } },
      });
      const sucursalIds = generador?.sucursal.map((s) => s.id) ?? [];
      if (!transaccion.sucursal_id || !sucursalIds.includes(transaccion.sucursal_id)) {
        throw new ForbiddenException('No tiene acceso a esta transacción');
      }
    }

    return transaccion;
  }

  /**
   * Transacciones pendientes de verificación para un acopiador.
   * Retorna transacciones en estado RECOLECTADO de sus recolectores asignados.
   */
  async findPendientes(userId: number) {
    const acopiador = await this.prisma.acopiador.findFirst({
      where: { usuario_id: userId },
    });
    if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');

    return this.prisma.transaccion.findMany({
      where: {
        acopiador_id: acopiador.id,
        estado: 'RECOLECTADO',
      },
      orderBy: { fecha_creacion: 'desc' },
      include: {
        recolector: { select: { id: true, nombre_completo: true, cedula_identidad: true } },
        zona: { select: { id: true, nombre: true } },
        detalle_transaccion: {
          include: { material: { select: { id: true, nombre: true } } },
        },
      },
    });
  }
}
