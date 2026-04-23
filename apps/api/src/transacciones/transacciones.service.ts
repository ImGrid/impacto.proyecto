import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, estado_transaccion, rol_usuario } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { ensureRecolectorPerteneceAlAcopiador } from '../common/auth';
import {
  CreateTransaccionDto,
  UpdateTransaccionDto,
  EditTransaccionAdminDto,
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
    // Desempate por id: cuando dos historiales se insertan en la misma
    // $transaction (p.ej. admin registra una entrega completa que genera
    // RECOLECTADO + ENTREGADO a la vez), el timestamp queda idéntico.
    // Ordenar también por id garantiza orden cronológico real.
    orderBy: [{ fecha: 'asc' as const }, { id: 'asc' as const }],
    include: {
      usuario: { select: { id: true, identificador: true, rol: true } },
    },
  },
  usuario: { select: { id: true, identificador: true, rol: true } },
} satisfies Prisma.transaccionInclude;

// Transiciones de estado válidas.
// El flujo real es GENERADO → RECOLECTADO → ENTREGADO → PAGADO. El acopiador
// nunca va directo a la sucursal del generador, por lo que GENERADO→ENTREGADO
// no es un escenario válido y se elimina para evitar transacciones sin
// recolector.
const TRANSICIONES_VALIDAS: Record<string, estado_transaccion[]> = {
  GENERADO: ['RECOLECTADO'],
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
      // Cuando el creador es ADMIN, el historial NO debe registrar al
      // admin como actor de los pasos — el admin solo registra en
      // nombre del recolector/acopiador reales. Guardamos sus usuario_id
      // aquí para construir el historial más abajo.
      let adminRecolectorUsuarioId: number | null = null;
      let adminAcopiadorUsuarioId: number | null = null;
      // Cuando la transacción tiene sucursal y el creador NO es el
      // propio generador, insertamos un paso GENERADO al inicio del
      // historial con el dueño de la sucursal como actor. Eso refleja
      // que el origen existió (aunque el generador no haya avisado
      // explícitamente por la app).
      let generadorAutoUsuarioId: number | null = null;

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

        // Verificar que el recolector existe Y pertenece a este acopiador.
        // Cierra el IDOR (BOLA) por el que un acopiador podía registrar
        // entregas a recolectores ajenos. El check va dentro de la
        // transacción para evitar TOCTOU.
        await ensureRecolectorPerteneceAlAcopiador(
          tx,
          dto.recolector_id,
          acopiador.id,
        );

        recolectorId = dto.recolector_id;
        acopiadorId = acopiador.id;
        zonaId = dto.zona_id ?? acopiador.zona_id;

      } else if (userRol === 'ADMIN') {
        // El admin solo registra dos tipos de entregas:
        //   - RECOLECTADO: el recolector ya recogió pero aún no entregó.
        //   - ENTREGADO:   flujo completo recolector → acopiador (sin pago).
        // El caso GENERADO lo hace el generador desde el móvil, no el admin.
        // PAGADO se alcanza solo registrando un pago.
        if (!dto.estado) {
          throw new BadRequestException(
            'Debe indicar en qué estado se creará la entrega',
          );
        }
        if (dto.estado === 'PAGADO') {
          throw new BadRequestException(
            'No se puede crear una entrega ya pagada. Primero registre la entrega y después regístrele un pago desde la sección de pagos.',
          );
        }
        if (dto.estado === 'GENERADO') {
          throw new BadRequestException(
            'El administrador no registra avisos del generador. Use "Registrar recolección" o "Registrar entrega".',
          );
        }
        estado = dto.estado;

        if (!dto.recolector_id) {
          throw new BadRequestException(
            'Indique qué recolector registrará esta entrega',
          );
        }

        // El recolector siempre pertenece a un acopiador fijo — no se
        // acepta override. Si el admin envía un acopiador_id distinto,
        // lo rechazamos explícitamente para evitar romper la regla.
        // Incluimos el acopiador y los usuarios de ambos en un solo query
        // para luego construir el historial con los actores reales (no
        // el admin) — el admin queda registrado en creado_por_id.
        const recolector = await tx.recolector.findUnique({
          where: { id: dto.recolector_id },
          include: { acopiador: true },
        });
        if (!recolector) {
          throw new BadRequestException('Recolector no encontrado');
        }

        if (
          dto.acopiador_id != null &&
          dto.acopiador_id !== recolector.acopiador_id
        ) {
          throw new BadRequestException(
            'El recolector seleccionado pertenece a otro acopiador. No se puede cambiar manualmente.',
          );
        }

        recolectorId = recolector.id;
        acopiadorId = recolector.acopiador_id;
        zonaId = dto.zona_id ?? recolector.zona_id;

        // Usuarios reales para el historial (más abajo).
        adminRecolectorUsuarioId = recolector.usuario_id;
        adminAcopiadorUsuarioId = recolector.acopiador.usuario_id;

        // Si manda zona_id distinta a la del recolector, se rechaza:
        // el recolector trabaja solo en su zona asignada.
        if (dto.zona_id != null && dto.zona_id !== recolector.zona_id) {
          throw new BadRequestException(
            'La zona no coincide con la zona del recolector seleccionado',
          );
        }

      } else {
        throw new ForbiddenException('Su rol no puede crear entregas');
      }

      // Paso GENERADO automático: si hay sucursal y el creador no es el
      // propio generador (que ya crea su paso GENERADO natural), cargamos
      // al generador dueño de la sucursal para insertar un paso GENERADO
      // al inicio del historial. Esto refleja en el recorrido que hubo un
      // origen identificable aunque el generador no haya usado la app.
      if (dto.sucursal_id != null && userRol !== 'GENERADOR') {
        const sucursalConGenerador = await tx.sucursal.findUnique({
          where: { id: dto.sucursal_id },
          include: { generador: { select: { usuario_id: true } } },
        });
        if (!sucursalConGenerador) {
          throw new BadRequestException('Sucursal no encontrada');
        }
        generadorAutoUsuarioId = sucursalConGenerador.generador.usuario_id;
      }

      // Validación de cantidad por rol. El GENERADOR puede registrar
      // materiales sin pesar (solo avisa qué tipo de residuo tiene); el
      // recolector que lo recoja medirá con su balanza y el acopiador
      // verificará el peso final. El resto de roles SÍ debe especificar
      // una cantidad mayor a 0 al crear.
      if (userRol !== 'GENERADOR') {
        for (const d of dto.detalles) {
          if (d.cantidad == null || d.cantidad <= 0) {
            throw new BadRequestException(
              'La cantidad de cada material debe ser mayor a 0',
            );
          }
        }
      }

      // Calcular subtotales y monto total. Si el generador no especificó
      // cantidad, queda en 0 (placeholder); el subtotal y monto_total
      // serán 0 hasta que el acopiador verifique con peso real.
      const detallesConSubtotal = dto.detalles.map((d) => ({
        material_id: d.material_id,
        cantidad: d.cantidad ?? 0,
        unidad_medida: d.unidad_medida,
        precio_unitario: d.precio_unitario ?? 0,
        subtotal: (d.cantidad ?? 0) * (d.precio_unitario ?? 0),
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
            throw new BadRequestException(
              'La hora debe tener el formato 08:30',
            );
          }
          const [, hh, mm] = match;
          hora = new Date(1970, 0, 1, Number(hh), Number(mm), 0);
        }
      }

      // Snapshot de los materiales para guardar en el JSONB del historial.
      const materialesSnapshot = dto.detalles.map((d) => ({
        material_id: d.material_id,
        cantidad: d.cantidad ?? 0,
        unidad_medida: d.unidad_medida,
        precio_unitario: d.precio_unitario,
      }));

      // Construir el historial según rol y estado.
      //
      //   - GENERADOR/RECOLECTOR/ACOPIADOR: un único paso, actor = usuario
      //     autenticado. El admin NO entra aquí.
      //   - ADMIN + RECOLECTADO: un paso RECOLECTADO con actor = recolector.
      //   - ADMIN + ENTREGADO: DOS pasos (RECOLECTADO por recolector,
      //     ENTREGADO por acopiador) para reflejar el flujo completo en
      //     el recorrido como si cada uno hubiera actuado. El admin queda
      //     registrado en `creado_por_id` para auditoría.
      type HistorialCreate = {
        estado: estado_transaccion;
        actor_id: number;
        rol_actor: rol_usuario;
        observaciones: string | undefined;
        detalles: { materiales: typeof materialesSnapshot } | undefined;
      };
      let historialRows: HistorialCreate[];

      // Snapshot sin precios para los pasos anteriores al ENTREGADO: en el
      // paso GENERADO o RECOLECTADO todavía no se conoce el precio final;
      // ese lo pone el acopiador al entregar.
      const snapshotSinPrecio = materialesSnapshot.map((m) => ({
        material_id: m.material_id,
        cantidad: m.cantidad,
        unidad_medida: m.unidad_medida,
        precio_unitario: undefined,
      }));

      if (userRol === 'ADMIN') {
        if (estado === 'RECOLECTADO') {
          historialRows = [
            {
              estado: 'RECOLECTADO',
              actor_id: adminRecolectorUsuarioId!,
              rol_actor: 'RECOLECTOR',
              observaciones: dto.observaciones,
              detalles: { materiales: snapshotSinPrecio },
            },
          ];
        } else {
          // ENTREGADO: dos filas — RECOLECTADO (recolector) + ENTREGADO (acopiador).
          historialRows = [
            {
              estado: 'RECOLECTADO',
              actor_id: adminRecolectorUsuarioId!,
              rol_actor: 'RECOLECTOR',
              observaciones: undefined,
              detalles: { materiales: snapshotSinPrecio },
            },
            {
              estado: 'ENTREGADO',
              actor_id: adminAcopiadorUsuarioId!,
              rol_actor: 'ACOPIADOR',
              observaciones: dto.observaciones,
              detalles: { materiales: materialesSnapshot },
            },
          ];
        }
      } else {
        historialRows = [
          {
            estado,
            actor_id: userId,
            rol_actor: userRol,
            observaciones: dto.observaciones,
            detalles: { materiales: materialesSnapshot },
          },
        ];
      }

      // Insertar paso GENERADO automático al inicio del historial si hay
      // sucursal y el rol creador no es GENERADOR (que ya lo crea natural).
      if (generadorAutoUsuarioId != null) {
        historialRows.unshift({
          estado: 'GENERADO',
          actor_id: generadorAutoUsuarioId,
          rol_actor: 'GENERADOR',
          observaciones: undefined,
          detalles: { materiales: snapshotSinPrecio },
        });
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
            create: historialRows,
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

    if (!transaccion) throw new NotFoundException('Entrega no encontrada');

    // Object-level authorization (OWASP API1:2023 BOLA): validar que el usuario
    // sea dueño del recurso antes de operar sobre él. No basta con el rol.
    if (userRol === 'ACOPIADOR') {
      const acopiador = await this.prisma.acopiador.findFirst({
        where: { usuario_id: userId },
      });
      if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');
      if (
        transaccion.acopiador_id !== null &&
        transaccion.acopiador_id !== acopiador.id
      ) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
    } else if (userRol === 'RECOLECTOR') {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
      });
      if (!recolector) throw new ForbiddenException('Recolector no encontrado');
      if (
        transaccion.recolector_id !== null &&
        transaccion.recolector_id !== recolector.id
      ) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
    }

    // Validar transición de estado
    const permitidas = TRANSICIONES_VALIDAS[transaccion.estado];
    if (!permitidas || !permitidas.includes(dto.estado)) {
      throw new BadRequestException(
        `No se puede avanzar la entrega de ${transaccion.estado} a ${dto.estado}`,
      );
    }

    // PAGADO nunca se alcanza por este endpoint. El único camino válido
    // es crear un pago desde el módulo de pagos, que registra el monto,
    // el vínculo con la entrega y el historial en una sola operación.
    // Permitirlo aquí dejaría la entrega marcada como pagada sin un
    // pago real en BD y rompería los reportes de "pagado por recolector".
    if (dto.estado === 'PAGADO') {
      throw new ForbiddenException(
        'Para marcar esta entrega como pagada, registre un pago desde la sección de pagos.',
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

      // Permite setear la sucursal de origen en el paso a ENTREGADO cuando
      // la transacción no la traía (p.ej. recolector no la indicó al crear).
      // Si ya tenía sucursal, el cliente la envía como undefined y se
      // preserva la existente.
      if (dto.sucursal_id != null && dto.sucursal_id !== transaccion.sucursal_id) {
        const sucursal = await tx.sucursal.findUnique({
          where: { id: dto.sucursal_id },
          select: { id: true, zona_id: true },
        });
        if (!sucursal) throw new BadRequestException('Sucursal no encontrada');
        updateData.sucursal = { connect: { id: sucursal.id } };
      }

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
              'Esta entrega no tiene recolector asignado. Cree una entrega nueva indicando quién la recogió.',
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
              'Esta entrega no tiene recolector o acopiador asignados. Cree una entrega nueva con los datos completos.',
            );
          }
        }
      }

      // Si vienen detalles nuevos, reemplazar los existentes
      if (dto.detalles?.length) {
        // El update lo realiza RECOLECTOR (al recoger), ACOPIADOR (al
        // verificar) o ADMIN. Ninguno de estos casos admite cantidad
        // sin especificar — la cantidad opcional es exclusiva del
        // GENERADOR al CREAR la transacción inicial.
        for (const d of dto.detalles) {
          if (d.cantidad == null || d.cantidad <= 0) {
            throw new BadRequestException(
              'La cantidad de cada material debe ser mayor a 0',
            );
          }
        }

        const detallesConSubtotal = dto.detalles.map((d) => ({
          material_id: d.material_id,
          cantidad: d.cantidad ?? 0,
          unidad_medida: d.unidad_medida,
          precio_unitario: d.precio_unitario ?? 0,
          subtotal: (d.cantidad ?? 0) * (d.precio_unitario ?? 0),
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
                  cantidad: d.cantidad ?? 0,
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
          recolector: {
            select: { id: true, nombre_completo: true, cedula_identidad: true },
          },
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

    if (!transaccion) throw new NotFoundException('Entrega no encontrada');

    // Validar acceso por rol
    if (userRol === 'RECOLECTOR') {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
      });
      if (transaccion.recolector_id !== recolector?.id) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
    } else if (userRol === 'ACOPIADOR') {
      const acopiador = await this.prisma.acopiador.findFirst({
        where: { usuario_id: userId },
      });
      if (transaccion.acopiador_id !== acopiador?.id) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
    } else if (userRol === 'GENERADOR') {
      const generador = await this.prisma.generador.findFirst({
        where: { usuario_id: userId },
        include: { sucursal: { select: { id: true } } },
      });
      const sucursalIds = generador?.sucursal.map((s) => s.id) ?? [];
      if (!transaccion.sucursal_id || !sucursalIds.includes(transaccion.sucursal_id)) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
    }

    return transaccion;
  }

  /**
   * Transacciones pendientes de verificación para un acopiador.
   * Retorna transacciones en estado RECOLECTADO de sus recolectores asignados.
   * Se puede filtrar opcionalmente por un recolector específico.
   */
  async findPendientes(userId: number, recolectorId?: number) {
    const acopiador = await this.prisma.acopiador.findFirst({
      where: { usuario_id: userId },
    });
    if (!acopiador) throw new ForbiddenException('Acopiador no encontrado');

    return this.prisma.transaccion.findMany({
      where: {
        acopiador_id: acopiador.id,
        estado: 'RECOLECTADO',
        ...(recolectorId ? { recolector_id: recolectorId } : {}),
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

  /**
   * Edición completa por el admin. No avanza el estado (para avanzar se
   * usa update()). Permite corregir errores de carga: fecha, hora,
   * recolector, sucursal, materiales, observaciones.
   *
   * Reglas:
   * - Si la entrega ya está pagada (tiene `pago_transaccion`), solo se
   *   permite cambiar `observaciones`. Cualquier otro campo devuelve 400.
   * - El nuevo recolector debe pertenecer al mismo acopiador actual
   *   (regla del cliente: relación recolector↔acopiador fija).
   * - Cambiar `sucursal_id` ajusta el paso GENERADO del historial:
   *   se inserta, elimina o actualiza según corresponda.
   * - Cambiar `recolector_id` actualiza el `actor_id` del paso
   *   RECOLECTADO del historial al nuevo usuario.
   */
  async editAdmin(id: number, dto: EditTransaccionAdminDto) {
    const existente = await this.prisma.transaccion.findUnique({
      where: { id },
      include: {
        pago_transaccion: { select: { id: true } },
        transaccion_historial: {
          select: { id: true, estado: true, actor_id: true },
        },
      },
    });
    if (!existente) throw new NotFoundException('Entrega no encontrada');

    const tienePago = existente.pago_transaccion != null;

    if (tienePago) {
      // Con pago registrado, solo se puede editar la observación.
      const intentaOtroCampo =
        dto.fecha !== undefined ||
        dto.hora !== undefined ||
        dto.recolector_id !== undefined ||
        dto.sucursal_id !== undefined ||
        (dto.detalles !== undefined && dto.detalles.length > 0);

      if (intentaOtroCampo) {
        throw new BadRequestException(
          'Esta entrega ya fue pagada. Solo puede editar la observación.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updateData: Prisma.transaccionUpdateInput = {};

      if (dto.observaciones !== undefined) {
        updateData.observaciones = dto.observaciones;
      }

      // Fecha / hora: solo si no está pagada (el guard de arriba lo asegura).
      if (dto.fecha !== undefined) {
        const fechaParsed = new Date(dto.fecha);
        if (fechaParsed > new Date()) {
          throw new BadRequestException('La fecha no puede ser futura');
        }
        updateData.fecha = fechaParsed;
      }
      if (dto.hora !== undefined) {
        const match = dto.hora.match(/^(\d{1,2}):(\d{2})$/);
        if (!match) {
          throw new BadRequestException(
            'La hora debe tener el formato 08:30',
          );
        }
        const [, hh, mm] = match;
        updateData.hora = new Date(1970, 0, 1, Number(hh), Number(mm), 0);
      }

      // Cambiar recolector. El nuevo debe pertenecer al mismo acopiador
      // actual — regla del cliente, el recolector↔acopiador es fijo.
      if (
        dto.recolector_id !== undefined &&
        dto.recolector_id !== existente.recolector_id
      ) {
        const nuevo = await tx.recolector.findUnique({
          where: { id: dto.recolector_id },
          select: { id: true, usuario_id: true, acopiador_id: true },
        });
        if (!nuevo) {
          throw new BadRequestException('Recolector no encontrado');
        }
        if (
          existente.acopiador_id != null &&
          nuevo.acopiador_id !== existente.acopiador_id
        ) {
          throw new BadRequestException(
            'Este recolector no pertenece al mismo acopiador de la entrega',
          );
        }
        updateData.recolector = { connect: { id: nuevo.id } };
        updateData.acopiador = { connect: { id: nuevo.acopiador_id } };

        // Actualizar actor_id del paso RECOLECTADO del historial.
        const pasoRecolectado = existente.transaccion_historial.find(
          (h) => h.estado === 'RECOLECTADO',
        );
        if (pasoRecolectado) {
          await tx.transaccion_historial.update({
            where: { id: pasoRecolectado.id },
            data: { actor_id: nuevo.usuario_id },
          });
        }
      }

      // Cambiar sucursal. Tres casos:
      //  a) de null/X a Y distinto: validar, actualizar/insertar paso GENERADO.
      //  b) de X a null: quitar paso GENERADO (si existe).
      //  c) sin cambio: no hacer nada.
      if (dto.sucursal_id !== undefined) {
        const sucursalActual = existente.sucursal_id;
        const pasoGenerado = existente.transaccion_historial.find(
          (h) => h.estado === 'GENERADO',
        );

        if (dto.sucursal_id === null) {
          // Quitar sucursal.
          updateData.sucursal = { disconnect: true };
          if (pasoGenerado) {
            await tx.transaccion_historial.delete({
              where: { id: pasoGenerado.id },
            });
          }
        } else if (dto.sucursal_id !== sucursalActual) {
          const sucursal = await tx.sucursal.findUnique({
            where: { id: dto.sucursal_id },
            include: { generador: { select: { usuario_id: true } } },
          });
          if (!sucursal) {
            throw new BadRequestException('Sucursal no encontrada');
          }
          updateData.sucursal = { connect: { id: sucursal.id } };

          if (pasoGenerado) {
            // Actualizar actor_id del paso GENERADO existente.
            await tx.transaccion_historial.update({
              where: { id: pasoGenerado.id },
              data: { actor_id: sucursal.generador.usuario_id },
            });
          } else {
            // Insertar paso GENERADO al inicio del historial. Usamos
            // fecha_creacion − 1ms para garantizar que quede antes del
            // paso RECOLECTADO original (que comparte el mismo ms y
            // tiene id menor al del GENERADO reinsertado — el orderBy
            // desempata por id, por eso ajustamos el timestamp).
            const fechaGenerado = new Date(
              existente.fecha_creacion.getTime() - 1,
            );
            await tx.transaccion_historial.create({
              data: {
                transaccion_id: id,
                estado: 'GENERADO',
                actor_id: sucursal.generador.usuario_id,
                rol_actor: 'GENERADOR',
                fecha: fechaGenerado,
              },
            });
          }
        }
      }

      // Detalles: reemplazar completos si vienen.
      if (dto.detalles !== undefined && dto.detalles.length > 0) {
        for (const d of dto.detalles) {
          if (d.cantidad == null || d.cantidad <= 0) {
            throw new BadRequestException(
              'La cantidad de cada material debe ser mayor a 0',
            );
          }
        }
        const detallesConSubtotal = dto.detalles.map((d) => ({
          transaccion_id: id,
          material_id: d.material_id,
          cantidad: d.cantidad ?? 0,
          unidad_medida: d.unidad_medida,
          precio_unitario: d.precio_unitario ?? 0,
          subtotal: (d.cantidad ?? 0) * (d.precio_unitario ?? 0),
        }));
        await tx.detalle_transaccion.deleteMany({
          where: { transaccion_id: id },
        });
        await tx.detalle_transaccion.createMany({ data: detallesConSubtotal });
        const montoTotal = detallesConSubtotal.reduce(
          (sum, d) => sum + d.subtotal,
          0,
        );
        updateData.monto_total = montoTotal;
      }

      if (Object.keys(updateData).length > 0) {
        await tx.transaccion.update({ where: { id }, data: updateData });
      }

      return tx.transaccion.findUniqueOrThrow({
        where: { id },
        include: transaccionInclude,
      });
    });
  }

  /**
   * Hard delete de una entrega. Reglas:
   * - Bloqueado si la entrega tiene un pago vinculado (409).
   * - Si no, CASCADE limpia historial y detalles automáticamente.
   */
  async remove(id: number) {
    const existente = await this.prisma.transaccion.findUnique({
      where: { id },
      include: { pago_transaccion: { select: { id: true } } },
    });
    if (!existente) throw new NotFoundException('Entrega no encontrada');

    if (existente.pago_transaccion != null) {
      throw new BadRequestException(
        'No se puede eliminar esta entrega porque ya tiene un pago registrado.',
      );
    }

    await this.prisma.transaccion.delete({ where: { id } });
  }
}
