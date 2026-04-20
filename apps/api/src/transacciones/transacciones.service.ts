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

      } else if (userRol === 'ADMIN') {
        // El admin registra transacciones manualmente en cualquier estado del flujo
        // excepto PAGADO (ese corresponde al flujo de pago del acopiador).
        if (!dto.estado) {
          throw new BadRequestException(
            'El administrador debe indicar el estado de la transacción',
          );
        }
        if (dto.estado === 'PAGADO') {
          throw new BadRequestException(
            'El estado PAGADO es exclusivo del flujo de pago del acopiador',
          );
        }
        estado = dto.estado;

        if (estado === 'GENERADO') {
          // Solo requiere sucursal; recolector_id y acopiador_id quedan null.
          if (!dto.sucursal_id) {
            throw new BadRequestException(
              'La sucursal es obligatoria para el estado GENERADO',
            );
          }
          const sucursal = await tx.sucursal.findUnique({
            where: { id: dto.sucursal_id },
          });
          if (!sucursal) throw new BadRequestException('Sucursal no encontrada');
          zonaId = dto.zona_id ?? sucursal.zona_id;

        } else if (estado === 'RECOLECTADO') {
          if (!dto.recolector_id) {
            throw new BadRequestException(
              'El recolector es obligatorio para el estado RECOLECTADO',
            );
          }
          const recolector = await tx.recolector.findUnique({
            where: { id: dto.recolector_id },
          });
          if (!recolector) throw new BadRequestException('Recolector no encontrado');
          recolectorId = recolector.id;

          // El admin puede indicar acopiador explícitamente o dejar que se herede
          // del que tenga asignado el recolector.
          if (dto.acopiador_id) {
            const acopiador = await tx.acopiador.findUnique({
              where: { id: dto.acopiador_id },
            });
            if (!acopiador) throw new BadRequestException('Acopiador no encontrado');
            acopiadorId = acopiador.id;
          } else {
            acopiadorId = recolector.acopiador_id;
          }

          zonaId = dto.zona_id ?? recolector.zona_id;

        } else {
          // ENTREGADO: recolector y acopiador son obligatorios.
          if (!dto.recolector_id) {
            throw new BadRequestException(
              'El recolector es obligatorio para el estado ENTREGADO',
            );
          }
          if (!dto.acopiador_id) {
            throw new BadRequestException(
              'El acopiador es obligatorio para el estado ENTREGADO',
            );
          }
          const recolector = await tx.recolector.findUnique({
            where: { id: dto.recolector_id },
          });
          if (!recolector) throw new BadRequestException('Recolector no encontrado');
          const acopiador = await tx.acopiador.findUnique({
            where: { id: dto.acopiador_id },
          });
          if (!acopiador) throw new BadRequestException('Acopiador no encontrado');

          recolectorId = recolector.id;
          acopiadorId = acopiador.id;
          zonaId = dto.zona_id ?? recolector.zona_id;
        }

        // Si el admin indicó zona_id explícitamente, validar que existe.
        if (dto.zona_id && dto.zona_id !== zonaId) {
          const zona = await tx.zona.findUnique({ where: { id: dto.zona_id } });
          if (!zona) throw new BadRequestException('Zona no encontrada');
          zonaId = dto.zona_id;
        }

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
      let fecha: Date = now;
      let hora: Date = now;

      // Backdating: solo ADMIN puede registrar fecha/hora distintas a "ahora".
      if (userRol === 'ADMIN') {
        if (dto.fecha) {
          const fechaParsed = new Date(dto.fecha);
          if (fechaParsed > now) {
            throw new BadRequestException('La fecha no puede ser futura');
          }
          fecha = fechaParsed;
        }
        if (dto.hora) {
          const match = dto.hora.match(/^(\d{1,2}):(\d{2})$/);
          if (!match) {
            throw new BadRequestException('La hora debe tener formato HH:mm');
          }
          const [, hh, mm] = match;
          hora = new Date(1970, 0, 1, Number(hh), Number(mm), 0);
        }
      }

      // Crear transacción + detalles + historial en una sola operación
      const transaccion = await tx.transaccion.create({
        data: {
          fecha,
          hora,
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

    // El admin puede mover entre GENERADO → RECOLECTADO → ENTREGADO pero nunca
    // marcar como PAGADO (ese estado corresponde al flujo de pago del acopiador).
    if (userRol === 'ADMIN' && dto.estado === 'PAGADO') {
      throw new ForbiddenException(
        'El administrador no puede marcar como PAGADO; eso lo hace el flujo de pago del acopiador',
      );
    }

    // Validar permisos por rol (admin queda autorizado para RECOLECTADO y ENTREGADO).
    if (
      dto.estado === 'RECOLECTADO' &&
      userRol !== 'RECOLECTOR' &&
      userRol !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Solo un recolector o un administrador puede marcar como RECOLECTADO',
      );
    }
    if (
      dto.estado === 'ENTREGADO' &&
      userRol !== 'ACOPIADOR' &&
      userRol !== 'ADMIN'
    ) {
      throw new ForbiddenException(
        'Solo un acopiador o un administrador puede marcar como ENTREGADO',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.transaccionUpdateInput = {
        estado: dto.estado,
        observaciones: dto.observaciones ?? transaccion.observaciones,
      };

      // Si es recolector tomando una transacción GENERADO, se auto-asigna.
      // El admin, en cambio, solo corrige el estado y respeta la asignación actual.
      if (dto.estado === 'RECOLECTADO') {
        if (userRol === 'RECOLECTOR') {
          const recolector = await tx.recolector.findFirst({
            where: { usuario_id: userId },
          });
          if (!recolector) throw new ForbiddenException('Recolector no encontrado');

          updateData.recolector = { connect: { id: recolector.id } };
          updateData.acopiador = { connect: { id: recolector.acopiador_id } };
        } else if (userRol === 'ADMIN') {
          // Para avanzar a RECOLECTADO la transacción ya debe tener recolector asignado.
          if (!transaccion.recolector_id) {
            throw new BadRequestException(
              'La transacción no tiene recolector asignado. Cree una transacción nueva en estado RECOLECTADO con el recolector correcto.',
            );
          }
        }
      }

      // Si es acopiador completando la transacción, se auto-asigna.
      // El admin respeta la asignación actual.
      if (dto.estado === 'ENTREGADO') {
        if (userRol === 'ACOPIADOR') {
          const acopiador = await tx.acopiador.findFirst({
            where: { usuario_id: userId },
          });
          if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');

          updateData.acopiador = { connect: { id: acopiador.id } };
        } else if (userRol === 'ADMIN') {
          // Para avanzar a ENTREGADO la transacción ya debe tener recolector y acopiador.
          if (!transaccion.recolector_id || !transaccion.acopiador_id) {
            throw new BadRequestException(
              'La transacción debe tener recolector y acopiador asignados. Cree una transacción nueva en estado ENTREGADO con los datos correctos.',
            );
          }
        }
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
    if (query.zona_id) where.zona_id = query.zona_id;
    // Solo ADMIN puede filtrar por recolector/acopiador arbitrarios
    if (userRol === 'ADMIN') {
      if (query.recolector_id) where.recolector_id = query.recolector_id;
      if (query.acopiador_id) where.acopiador_id = query.acopiador_id;
    }

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

  /**
   * Transacciones disponibles para recoger (estado GENERADO en la zona del recolector).
   * Son transacciones creadas por generadores que aún no fueron recogidas.
   */
  async findDisponibles(userId: number) {
    const recolector = await this.prisma.recolector.findFirst({
      where: { usuario_id: userId },
    });
    if (!recolector) throw new ForbiddenException('Recolector no encontrado');

    return this.prisma.transaccion.findMany({
      where: {
        estado: 'GENERADO',
        recolector_id: null,
        zona_id: recolector.zona_id,
      },
      orderBy: { fecha_creacion: 'desc' },
      include: {
        sucursal: {
          select: {
            id: true,
            nombre: true,
            generador: { select: { id: true, razon_social: true } },
          },
        },
        zona: { select: { id: true, nombre: true } },
        detalle_transaccion: {
          include: { material: { select: { id: true, nombre: true } } },
        },
      },
    });
  }
}
