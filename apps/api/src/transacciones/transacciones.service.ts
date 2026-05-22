import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, estado_transaccion, rol_usuario } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { ensureMismoDepartamento } from '../common/auth';
import {
  CreateTransaccionDto,
  DetalleTransaccionDto,
  UpdateTransaccionDto,
  EditTransaccionAdminDto,
  TransaccionQueryDto,
} from './dto';

// Relaciones que siempre se cargan al consultar transacciones.
//
// Con el cambio definitivo (cambio 2.6) la sucursal vive a NIVEL DE LÍNEA
// (`detalle_transaccion.sucursal_id`), no a nivel de cabecera. Esto permite
// que una sola entrega del recolector consolide material proveniente de
// varias sucursales distintas.
const transaccionInclude = {
  recolector: {
    select: { id: true, nombre_completo: true, cedula_identidad: true },
  },
  centro_operacional: {
    select: { id: true, nombre_completo: true, nombre_punto: true },
  },
  acopiador_comprador_externo: {
    select: { id: true, nombre: true, asociacion: true },
  },
  zona: { select: { id: true, nombre: true } },
  detalle_transaccion: {
    include: {
      material: { select: { id: true, nombre: true, unidad_medida_default: true } },
      sucursal: {
        select: {
          id: true,
          nombre: true,
          generador: { select: { id: true, razon_social: true } },
        },
      },
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
// El flujo real es GENERADO → RECOLECTADO → ENTREGADO → PAGADO.
const TRANSICIONES_VALIDAS: Record<string, estado_transaccion[]> = {
  GENERADO: ['RECOLECTADO'],
  RECOLECTADO: ['ENTREGADO'],
  ENTREGADO: ['PAGADO'],
};

// Snapshot de materiales que se guarda en `transaccion_historial.detalles`.
// Incluye sucursal_id para que el detalle del historial preserve el origen
// aunque después se editen los detalles.
type MaterialSnapshot = {
  material_id: number;
  cantidad: number;
  unidad_medida: string;
  precio_unitario: number | undefined;
  sucursal_id?: number;
};

type HistorialCreate = {
  estado: estado_transaccion;
  actor_id: number;
  rol_actor: rol_usuario;
  observaciones: string | undefined;
  detalles:
    | {
        materiales: MaterialSnapshot[];
        sucursal_id?: number;
      }
    | undefined;
};

@Injectable()
export class TransaccionesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear transacción. El estado y el destino se determinan por el rol del
   * creador. Con el cambio 2.6 la sucursal vive POR LÍNEA de detalle
   * (`detalle.sucursal_id`), no en la cabecera.
   *
   * - GENERADOR → GENERADO. Sin destino. Sin recolector. Los detalles que
   *   envía nacen con su sucursal (autocompletada si tiene una sola, o
   *   exigida explícitamente si tiene varias).
   * - RECOLECTOR → RECOLECTADO. Destino OPCIONAL. Los detalles pueden traer
   *   `sucursal_id` opcional por línea; si lo traen, deben ser del mismo
   *   depto del recolector.
   * - ACOPIADOR (centro operacional) → ENTREGADO. Destino auto = él mismo.
   *   Detalles con `sucursal_id` opcional, validados same-depto con el
   *   recolector indicado.
   * - ADMIN → estado explícito (RECOLECTADO o ENTREGADO):
   *     • RECOLECTADO: el admin registra que se recolectó. Destino siempre vacío.
   *     • ENTREGADO: el admin registra una entrega. Destino libre.
   *   En ambos casos los detalles pueden traer `sucursal_id` opcional.
   */
  async create(
    dto: CreateTransaccionDto,
    userId: number,
    userRol: rol_usuario,
  ) {
    return this.prisma.$transaction(async (tx) => {
      let estado: estado_transaccion;
      let recolectorId: number | null = null;
      let zonaId: number;

      // Destino polimórfico de la transacción. Máximo 1 marcado.
      let centroOperacionalId: number | null = null;
      let acopiadorExternoId: number | null = null;
      let destinoDesconocido = false;

      // Cuando el creador es ADMIN, el historial registra los pasos del
      // recolector y centro operacional reales como actores (no al admin),
      // siempre que esos actores existan.
      let adminRecolectorUsuarioId: number | null = null;
      let adminCentroOpUsuarioId: number | null = null;

      if (userRol === 'GENERADOR') {
        estado = 'GENERADO';

        const generador = await tx.generador.findFirst({
          where: { usuario_id: userId },
          include: { sucursal: { select: { id: true, zona_id: true } } },
        });
        if (!generador) throw new ForbiddenException('Generador no encontrado');

        // El generador siempre crea un aviso de UNA sola sucursal: todas
        // las líneas que envía deben tener la misma `sucursal_id` (o
        // ninguna, en cuyo caso autocompletamos si tiene una sola sucursal).
        const sucursalIdsValidas = new Set(generador.sucursal.map((s) => s.id));
        let sucursalDelAviso: number | null = null;

        for (const d of dto.detalles) {
          if (d.sucursal_id != null) {
            if (!sucursalIdsValidas.has(d.sucursal_id)) {
              throw new BadRequestException(
                'La sucursal indicada no le pertenece',
              );
            }
            if (sucursalDelAviso == null) {
              sucursalDelAviso = d.sucursal_id;
            } else if (sucursalDelAviso !== d.sucursal_id) {
              throw new BadRequestException(
                'Un aviso solo puede ser de una sucursal a la vez. Cree un aviso por cada sucursal.',
              );
            }
          }
        }

        // Si no vino sucursal explícita en ningún detalle, autocompletar
        // si el generador tiene una sola sucursal.
        if (sucursalDelAviso == null) {
          if (generador.sucursal.length === 0) {
            throw new BadRequestException(
              'No tiene sucursales registradas para crear avisos',
            );
          }
          if (generador.sucursal.length > 1) {
            throw new BadRequestException(
              'Indique a qué sucursal corresponde el aviso',
            );
          }
          sucursalDelAviso = generador.sucursal[0].id;
          // Autocompletar todos los detalles.
          for (const d of dto.detalles) {
            d.sucursal_id = sucursalDelAviso;
          }
        }

        const sucursalUsada = generador.sucursal.find(
          (s) => s.id === sucursalDelAviso,
        )!;
        zonaId = sucursalUsada.zona_id;
        // GENERADO no lleva destino — siempre los 3 campos vacíos.

      } else if (userRol === 'RECOLECTOR') {
        estado = 'RECOLECTADO';

        const recolector = await tx.recolector.findFirst({
          where: { usuario_id: userId },
        });
        if (!recolector) throw new ForbiddenException('Recolector no encontrado');

        recolectorId = recolector.id;
        zonaId = dto.zona_id ?? recolector.zona_id;

        this.validarUnicidadDestino(
          dto.centro_operacional_id,
          dto.acopiador_externo_id,
          dto.destino_desconocido,
        );

        if (dto.centro_operacional_id != null) {
          await ensureMismoDepartamento(
            tx,
            recolector.id,
            dto.centro_operacional_id,
          );
          centroOperacionalId = dto.centro_operacional_id;
        } else if (dto.acopiador_externo_id != null) {
          await this.verificarExternoActivo(tx, dto.acopiador_externo_id);
          acopiadorExternoId = dto.acopiador_externo_id;
        } else if (dto.destino_desconocido === true) {
          destinoDesconocido = true;
        }

        await this.validarSucursalesDeDetalles(tx, dto.detalles, recolector.id);

      } else if (userRol === 'ACOPIADOR') {
        estado = 'ENTREGADO';

        const centro = await tx.centro_operacional.findFirst({
          where: { usuario_id: userId },
        });
        if (!centro) {
          throw new ForbiddenException('Centro operacional no encontrado');
        }

        if (!dto.recolector_id) {
          throw new BadRequestException('El recolector es obligatorio');
        }

        await ensureMismoDepartamento(tx, dto.recolector_id, centro.id);

        recolectorId = dto.recolector_id;
        centroOperacionalId = centro.id;
        zonaId = dto.zona_id ?? centro.zona_id;

        await this.validarSucursalesDeDetalles(tx, dto.detalles, recolectorId);

      } else if (userRol === 'ADMIN') {
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

        const recolector = await tx.recolector.findUnique({
          where: { id: dto.recolector_id },
        });
        if (!recolector) {
          throw new BadRequestException('Recolector no encontrado');
        }

        recolectorId = recolector.id;
        zonaId = dto.zona_id ?? recolector.zona_id;
        adminRecolectorUsuarioId = recolector.usuario_id;

        if (dto.zona_id != null && dto.zona_id !== recolector.zona_id) {
          throw new BadRequestException(
            'La zona no coincide con la zona del recolector seleccionado',
          );
        }

        await this.validarSucursalesDeDetalles(tx, dto.detalles, recolector.id);

        if (estado === 'ENTREGADO') {
          this.validarUnicidadDestino(
            dto.centro_operacional_id,
            dto.acopiador_externo_id,
            dto.destino_desconocido,
          );

          if (dto.centro_operacional_id != null) {
            await ensureMismoDepartamento(
              tx,
              recolector.id,
              dto.centro_operacional_id,
            );
            centroOperacionalId = dto.centro_operacional_id;
            const centro = await tx.centro_operacional.findUnique({
              where: { id: dto.centro_operacional_id },
              select: { usuario_id: true },
            });
            adminCentroOpUsuarioId = centro?.usuario_id ?? null;
          } else if (dto.acopiador_externo_id != null) {
            await this.verificarExternoActivo(tx, dto.acopiador_externo_id);
            acopiadorExternoId = dto.acopiador_externo_id;
          } else if (dto.destino_desconocido === true) {
            destinoDesconocido = true;
          }
        }

      } else {
        throw new ForbiddenException('Su rol no puede crear entregas');
      }

      // Validación de cantidad por rol. El GENERADOR puede registrar
      // materiales sin pesar (solo avisa qué tipo de residuo tiene); el
      // recolector que lo recoja medirá con su balanza y el acopiador
      // verificará el peso final.
      if (userRol !== 'GENERADOR') {
        for (const d of dto.detalles) {
          if (d.cantidad == null || d.cantidad <= 0) {
            throw new BadRequestException(
              'La cantidad de cada material debe ser mayor a 0',
            );
          }
        }
      }

      // Calcular subtotales y monto total.
      const detallesConSubtotal = dto.detalles.map((d) => ({
        material_id: d.material_id,
        cantidad: d.cantidad ?? 0,
        unidad_medida: d.unidad_medida,
        precio_unitario: d.precio_unitario ?? 0,
        subtotal: (d.cantidad ?? 0) * (d.precio_unitario ?? 0),
        sucursal_id: d.sucursal_id ?? null,
      }));

      const montoTotal = detallesConSubtotal.reduce(
        (sum, d) => sum + d.subtotal,
        0,
      );

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

      // Snapshots para el historial.
      const materialesSnapshot: MaterialSnapshot[] = dto.detalles.map((d) => ({
        material_id: d.material_id,
        cantidad: d.cantidad ?? 0,
        unidad_medida: d.unidad_medida,
        precio_unitario: d.precio_unitario,
        ...(d.sucursal_id != null ? { sucursal_id: d.sucursal_id } : {}),
      }));

      // Snapshot sin precios para pasos anteriores al ENTREGADO.
      const snapshotSinPrecio: MaterialSnapshot[] = materialesSnapshot.map(
        (m) => ({
          material_id: m.material_id,
          cantidad: m.cantidad,
          unidad_medida: m.unidad_medida,
          precio_unitario: undefined,
          ...(m.sucursal_id != null ? { sucursal_id: m.sucursal_id } : {}),
        }),
      );

      // Construir el historial.
      let historialRows: HistorialCreate[];

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
          // ENTREGADO: dos filas — RECOLECTADO (recolector) + ENTREGADO (variable).
          const entregadoActorId = adminCentroOpUsuarioId ?? userId;
          const entregadoRolActor: rol_usuario =
            adminCentroOpUsuarioId != null ? 'ACOPIADOR' : 'ADMIN';
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
              actor_id: entregadoActorId,
              rol_actor: entregadoRolActor,
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

      // Pasos GENERADO automáticos: uno por cada sucursal distinta presente
      // en los detalles, con el generador dueño como actor. Refleja en el
      // historial que el material tuvo un origen identificable aunque el
      // generador no haya avisado por la app.
      //
      // Para el rol GENERADOR este bloque se omite porque su paso GENERADO
      // natural (insertado arriba) ya cubre el origen real (un solo aviso
      // por sucursal).
      if (userRol !== 'GENERADOR') {
        const pasosGeneradoAuto = await this.buildPasosGeneradoAuto(
          tx,
          dto.detalles,
        );
        // Los insertamos al inicio del historial.
        historialRows = [...pasosGeneradoAuto, ...historialRows];
      }

      const transaccion = await tx.transaccion.create({
        data: {
          fecha,
          hora,
          recolector_id: recolectorId,
          centro_operacional_id: centroOperacionalId,
          acopiador_externo_id: acopiadorExternoId,
          destino_desconocido: destinoDesconocido,
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
   * Avanzar el estado de una transacción.
   * Valida transiciones permitidas y permisos por rol.
   */
  async update(
    id: number,
    dto: UpdateTransaccionDto,
    userId: number,
    userRol: rol_usuario,
    departamentoActivo: number | null,
  ) {
    const transaccion = await this.prisma.transaccion.findUnique({
      where: { id },
    });

    if (!transaccion) throw new NotFoundException('Entrega no encontrada');

    // Object-level authorization (OWASP API1:2023 BOLA).
    if (userRol === 'ACOPIADOR') {
      const centro = await this.prisma.centro_operacional.findFirst({
        where: { usuario_id: userId },
      });
      if (!centro) {
        throw new ForbiddenException('Centro operacional no encontrado');
      }
      if (
        transaccion.centro_operacional_id !== null &&
        transaccion.centro_operacional_id !== centro.id
      ) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
      if (
        transaccion.acopiador_externo_id !== null ||
        transaccion.destino_desconocido === true
      ) {
        throw new ForbiddenException(
          'Esta entrega tiene como destino un acopiador externo o desconocido y no puede ser verificada desde el sistema',
        );
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
    } else if (userRol === 'ADMIN' && departamentoActivo != null) {
      // Filtro global: el admin solo puede operar sobre transacciones de su
      // departamento activo. Mismo criterio que findOne y editAdmin.
      const deptoTransaccion = await this.derivarDeptoDeTransaccion(
        this.prisma,
        transaccion.id,
        transaccion.recolector_id,
      );
      if (deptoTransaccion !== departamentoActivo) {
        throw new NotFoundException('Entrega no encontrada');
      }
    }

    const permitidas = TRANSICIONES_VALIDAS[transaccion.estado];
    if (!permitidas || !permitidas.includes(dto.estado)) {
      throw new BadRequestException(
        `No se puede avanzar la entrega de ${transaccion.estado} a ${dto.estado}`,
      );
    }

    if (dto.estado === 'PAGADO') {
      throw new ForbiddenException(
        'Para marcar esta entrega como pagada, registre un pago desde la sección de pagos.',
      );
    }

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
      if (dto.estado === 'RECOLECTADO') {
        if (userRol === 'RECOLECTOR') {
          const recolector = await tx.recolector.findFirst({
            where: { usuario_id: userId },
          });
          if (!recolector) throw new ForbiddenException('Recolector no encontrado');
          updateData.recolector = { connect: { id: recolector.id } };
        } else if (userRol === 'ADMIN') {
          if (!transaccion.recolector_id) {
            throw new BadRequestException(
              'Esta entrega no tiene recolector asignado. Cree una entrega nueva indicando quién la recogió.',
            );
          }
        }
      }

      // Si es centro operacional verificando, se autoasigna como destino.
      if (dto.estado === 'ENTREGADO') {
        if (userRol === 'ACOPIADOR') {
          const centro = await tx.centro_operacional.findFirst({
            where: { usuario_id: userId },
          });
          if (!centro) {
            throw new ForbiddenException('Centro operacional no encontrado');
          }
          if (!transaccion.recolector_id) {
            throw new BadRequestException(
              'Esta entrega no tiene recolector. No se puede verificar.',
            );
          }
          await ensureMismoDepartamento(
            tx,
            transaccion.recolector_id,
            centro.id,
          );
          updateData.centro_operacional = { connect: { id: centro.id } };
        } else if (userRol === 'ADMIN') {
          if (!transaccion.recolector_id) {
            throw new BadRequestException(
              'Esta entrega no tiene recolector. Indique quién la recogió antes de marcarla como entregada.',
            );
          }
        }
      }

      // Reemplazar detalles si vienen.
      if (dto.detalles?.length) {
        for (const d of dto.detalles) {
          if (d.cantidad == null || d.cantidad <= 0) {
            throw new BadRequestException(
              'La cantidad de cada material debe ser mayor a 0',
            );
          }
        }

        // Recolector efectivo después del update: si lo estamos
        // auto-asignando arriba o ya existía, validamos same-depto con
        // las sucursales nuevas.
        const recolectorIdEfectivo =
          updateData.recolector && 'connect' in updateData.recolector
            ? (updateData.recolector.connect as { id: number }).id
            : transaccion.recolector_id;
        if (recolectorIdEfectivo != null) {
          await this.validarSucursalesDeDetalles(
            tx,
            dto.detalles,
            recolectorIdEfectivo,
          );
        }

        const detallesConSubtotal = dto.detalles.map((d) => ({
          material_id: d.material_id,
          cantidad: d.cantidad ?? 0,
          unidad_medida: d.unidad_medida,
          precio_unitario: d.precio_unitario ?? 0,
          subtotal: (d.cantidad ?? 0) * (d.precio_unitario ?? 0),
          sucursal_id: d.sucursal_id ?? null,
        }));

        const montoTotal = detallesConSubtotal.reduce(
          (sum, d) => sum + d.subtotal,
          0,
        );
        updateData.monto_total = montoTotal;

        await tx.detalle_transaccion.deleteMany({
          where: { transaccion_id: id },
        });
        await tx.detalle_transaccion.createMany({
          data: detallesConSubtotal.map((d) => ({ transaccion_id: id, ...d })),
        });
      }

      await tx.transaccion.update({
        where: { id },
        data: updateData,
      });

      // Crear registro en historial para este avance.
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
                  ...(d.sucursal_id != null
                    ? { sucursal_id: d.sucursal_id }
                    : {}),
                })),
              }
            : undefined,
        },
      });

      return tx.transaccion.findUniqueOrThrow({
        where: { id },
        include: transaccionInclude,
      });
    });
  }

  /**
   * Listar transacciones con filtros. Filtra automáticamente por rol:
   * - ADMIN: ve todas las del depto activo
   * - ACOPIADOR: ve las que tienen como destino su centro op
   * - RECOLECTOR: ve solo las suyas
   * - GENERADOR: ve las que tienen alguna de sus sucursales en algún detalle
   */
  async findAll(
    query: TransaccionQueryDto,
    userId: number,
    userRol: rol_usuario,
    departamentoActivo: number | null,
  ) {
    const where: Prisma.transaccionWhereInput = {};

    if (userRol === 'ACOPIADOR') {
      const centro = await this.prisma.centro_operacional.findFirst({
        where: { usuario_id: userId },
      });
      if (!centro) {
        throw new ForbiddenException('Centro operacional no encontrado');
      }
      where.centro_operacional_id = centro.id;
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
      // La transacción pertenece al generador si AL MENOS UNO de sus detalles
      // viene de una de sus sucursales.
      where.detalle_transaccion = {
        some: { sucursal_id: { in: sucursalIds } },
      };
    } else if (userRol === 'ADMIN' && departamentoActivo != null) {
      // Filtro global por depto activo. La transacción "pertenece" al depto
      // si: (a) su recolector está en ese depto, o (b) alguno de sus
      // detalles viene de una sucursal de ese depto (caso GENERADO sin
      // recolector, o entregas con origen identificado).
      where.OR = [
        { recolector: { departamento_id: departamentoActivo } },
        {
          detalle_transaccion: {
            some: { sucursal: { departamento_id: departamentoActivo } },
          },
        },
      ];
    }

    if (query.estado) where.estado = query.estado;
    if (query.zona_id) where.zona_id = query.zona_id;
    if (userRol === 'ADMIN') {
      if (query.recolector_id) where.recolector_id = query.recolector_id;
      if (query.centro_operacional_id) {
        where.centro_operacional_id = query.centro_operacional_id;
      }
      if (query.acopiador_externo_id) {
        where.acopiador_externo_id = query.acopiador_externo_id;
      }
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
          centro_operacional: {
            select: { id: true, nombre_completo: true, nombre_punto: true },
          },
          acopiador_comprador_externo: {
            select: { id: true, nombre: true, asociacion: true },
          },
          zona: { select: { id: true, nombre: true } },
          detalle_transaccion: {
            include: {
              material: { select: { id: true, nombre: true } },
              sucursal: {
                select: {
                  id: true,
                  nombre: true,
                  generador: { select: { id: true, razon_social: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.transaccion.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  /**
   * Detalle completo de una transacción. Valida acceso por rol.
   */
  async findOne(
    id: number,
    userId: number,
    userRol: rol_usuario,
    departamentoActivo: number | null,
  ) {
    const transaccion = await this.prisma.transaccion.findUnique({
      where: { id },
      include: transaccionInclude,
    });

    if (!transaccion) throw new NotFoundException('Entrega no encontrada');

    if (userRol === 'RECOLECTOR') {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
      });
      if (transaccion.recolector_id !== recolector?.id) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
    } else if (userRol === 'ACOPIADOR') {
      const centro = await this.prisma.centro_operacional.findFirst({
        where: { usuario_id: userId },
      });
      if (transaccion.centro_operacional_id !== centro?.id) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
    } else if (userRol === 'GENERADOR') {
      const generador = await this.prisma.generador.findFirst({
        where: { usuario_id: userId },
        include: { sucursal: { select: { id: true } } },
      });
      const sucursalIds = new Set(
        generador?.sucursal.map((s) => s.id) ?? [],
      );
      const tieneAlguna = transaccion.detalle_transaccion.some(
        (d) => d.sucursal_id != null && sucursalIds.has(d.sucursal_id),
      );
      if (!tieneAlguna) {
        throw new ForbiddenException('No tiene acceso a esta entrega');
      }
    } else if (userRol === 'ADMIN' && departamentoActivo != null) {
      const deptoTransaccion = await this.derivarDeptoDeTransaccion(
        this.prisma,
        transaccion.id,
        transaccion.recolector_id,
      );
      if (deptoTransaccion !== departamentoActivo) {
        throw new NotFoundException('Entrega no encontrada');
      }
    }

    return transaccion;
  }

  /**
   * Transacciones pendientes de verificación para un centro operacional.
   * RECOLECTADO con destino = este centro.
   */
  async findPendientes(userId: number, recolectorId?: number) {
    const centro = await this.prisma.centro_operacional.findFirst({
      where: { usuario_id: userId },
    });
    if (!centro) {
      throw new ForbiddenException('Centro operacional no encontrado');
    }

    return this.prisma.transaccion.findMany({
      where: {
        centro_operacional_id: centro.id,
        estado: 'RECOLECTADO',
        ...(recolectorId ? { recolector_id: recolectorId } : {}),
      },
      orderBy: { fecha_creacion: 'desc' },
      include: {
        recolector: {
          select: { id: true, nombre_completo: true, cedula_identidad: true },
        },
        zona: { select: { id: true, nombre: true } },
        detalle_transaccion: {
          include: {
            material: { select: { id: true, nombre: true } },
            sucursal: {
              select: {
                id: true,
                nombre: true,
                generador: { select: { id: true, razon_social: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Transacciones disponibles para recoger (GENERADO sin recolector en la
   * zona del recolector consultante).
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
        zona: { select: { id: true, nombre: true } },
        detalle_transaccion: {
          include: {
            material: { select: { id: true, nombre: true } },
            sucursal: {
              select: {
                id: true,
                nombre: true,
                generador: { select: { id: true, razon_social: true } },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Edición completa por el admin. No avanza el estado.
   *
   * Reglas:
   * - Si la entrega ya está pagada, solo se permite cambiar `observaciones`.
   * - Si se asigna un centro operacional como destino, debe estar en el
   *   mismo departamento que el recolector.
   * - Si se asigna un acopiador externo, debe estar activo.
   * - Cambiar `recolector_id` actualiza el `actor_id` del paso RECOLECTADO.
   * - Cambiar `detalles` recalcula los pasos GENERADO automáticos: se
   *   eliminan los existentes y se vuelven a crear según las sucursales
   *   distintas que aparezcan en los nuevos detalles.
   * - El destino se redefine completo si llega cualquiera de los 3 campos.
   */
  async editAdmin(
    id: number,
    dto: EditTransaccionAdminDto,
    departamentoActivo: number | null,
  ) {
    const existente = await this.prisma.transaccion.findUnique({
      where: { id },
      include: {
        pago_transaccion: { select: { id: true } },
        transaccion_historial: {
          select: { id: true, estado: true, actor_id: true },
        },
        recolector: { select: { departamento_id: true } },
        detalle_transaccion: {
          select: {
            sucursal: { select: { departamento_id: true } },
          },
        },
      },
    });
    if (!existente) throw new NotFoundException('Entrega no encontrada');

    // Filtro global: el admin solo puede editar transacciones de su depto activo.
    if (departamentoActivo != null) {
      const deptoTransaccion =
        existente.recolector?.departamento_id ??
        existente.detalle_transaccion.find((d) => d.sucursal != null)
          ?.sucursal?.departamento_id ??
        null;
      if (deptoTransaccion !== departamentoActivo) {
        throw new NotFoundException('Entrega no encontrada');
      }
    }

    const tienePago = existente.pago_transaccion != null;

    if (tienePago) {
      const intentaOtroCampo =
        dto.fecha !== undefined ||
        dto.hora !== undefined ||
        dto.recolector_id !== undefined ||
        dto.centro_operacional_id !== undefined ||
        dto.acopiador_externo_id !== undefined ||
        dto.destino_desconocido !== undefined ||
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

      // Cambiar recolector.
      if (
        dto.recolector_id !== undefined &&
        dto.recolector_id !== existente.recolector_id
      ) {
        const nuevo = await tx.recolector.findUnique({
          where: { id: dto.recolector_id },
          select: { id: true, usuario_id: true, departamento_id: true },
        });
        if (!nuevo) {
          throw new BadRequestException('Recolector no encontrado');
        }
        // Si la transacción tiene destino centro op, el nuevo recolector
        // debe estar en el mismo depto que ese centro op.
        const existenteCentroOp = await tx.transaccion.findUnique({
          where: { id },
          select: { centro_operacional_id: true },
        });
        if (existenteCentroOp?.centro_operacional_id != null) {
          await ensureMismoDepartamento(
            tx,
            nuevo.id,
            existenteCentroOp.centro_operacional_id,
          );
        }
        updateData.recolector = { connect: { id: nuevo.id } };

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

      // Cambiar destino (polimórfico).
      const tocaDestino =
        dto.centro_operacional_id !== undefined ||
        dto.acopiador_externo_id !== undefined ||
        dto.destino_desconocido !== undefined;

      if (tocaDestino) {
        this.validarUnicidadDestino(
          dto.centro_operacional_id,
          dto.acopiador_externo_id,
          dto.destino_desconocido,
        );

        const nuevoCentro = dto.centro_operacional_id ?? null;
        const nuevoExterno = dto.acopiador_externo_id ?? null;
        const nuevoDesconocido = dto.destino_desconocido === true;

        if (nuevoCentro != null) {
          const recolectorIdEfectivo =
            dto.recolector_id ?? existente.recolector_id;
          if (recolectorIdEfectivo == null) {
            throw new BadRequestException(
              'No se puede asignar un centro operacional si la entrega no tiene recolector',
            );
          }
          await ensureMismoDepartamento(tx, recolectorIdEfectivo, nuevoCentro);
        }
        if (nuevoExterno != null) {
          await this.verificarExternoActivo(tx, nuevoExterno);
        }

        await tx.transaccion.update({
          where: { id },
          data: {
            centro_operacional_id: nuevoCentro,
            acopiador_externo_id: nuevoExterno,
            destino_desconocido: nuevoDesconocido,
          },
        });
      }

      // Reemplazar detalles si vienen.
      if (dto.detalles !== undefined && dto.detalles.length > 0) {
        for (const d of dto.detalles) {
          if (d.cantidad == null || d.cantidad <= 0) {
            throw new BadRequestException(
              'La cantidad de cada material debe ser mayor a 0',
            );
          }
        }

        // Validar sucursales same-depto con el recolector resultante.
        const recolectorIdEfectivo =
          dto.recolector_id ?? existente.recolector_id;
        if (recolectorIdEfectivo != null) {
          await this.validarSucursalesDeDetalles(
            tx,
            dto.detalles,
            recolectorIdEfectivo,
          );
        }

        const detallesConSubtotal = dto.detalles.map((d) => ({
          transaccion_id: id,
          material_id: d.material_id,
          cantidad: d.cantidad ?? 0,
          unidad_medida: d.unidad_medida,
          precio_unitario: d.precio_unitario ?? 0,
          subtotal: (d.cantidad ?? 0) * (d.precio_unitario ?? 0),
          sucursal_id: d.sucursal_id ?? null,
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

        // Reconstruir pasos GENERADO automáticos en el historial. Solo
        // tocamos los pasos GENERADO con `rol_actor = GENERADOR` que NO
        // fueron creados por el propio generador desde la app. Como no
        // hay forma reliable de distinguirlos del "natural", aplicamos
        // una regla conservadora: si la transacción NO fue creada por
        // GENERADOR, eliminamos TODOS los pasos GENERADO y los recreamos
        // según las sucursales nuevas. Si fue creada por GENERADOR, no
        // tocamos el paso natural (raro en editAdmin, pero defensivo).
        const transFull = await tx.transaccion.findUnique({
          where: { id },
          select: {
            creado_por_id: true,
            usuario: { select: { rol: true } },
            fecha_creacion: true,
          },
        });
        const creadoPorGenerador =
          transFull?.usuario?.rol === ('GENERADOR' as rol_usuario);

        if (!creadoPorGenerador) {
          const pasosGeneradoExistentes =
            existente.transaccion_historial.filter(
              (h) => h.estado === 'GENERADO',
            );
          if (pasosGeneradoExistentes.length > 0) {
            await tx.transaccion_historial.deleteMany({
              where: {
                id: { in: pasosGeneradoExistentes.map((p) => p.id) },
              },
            });
          }

          // Crear pasos GENERADO nuevos por cada sucursal distinta de los
          // detalles. Usamos timestamp ligeramente anterior a fecha_creacion
          // para que aparezcan antes en el orden cronológico.
          const pasosGenerado = await this.buildPasosGeneradoAuto(
            tx,
            dto.detalles,
          );
          if (pasosGenerado.length > 0 && transFull) {
            const baseTs = transFull.fecha_creacion.getTime();
            for (let i = 0; i < pasosGenerado.length; i++) {
              const p = pasosGenerado[i];
              await tx.transaccion_historial.create({
                data: {
                  transaccion_id: id,
                  estado: p.estado,
                  actor_id: p.actor_id,
                  rol_actor: p.rol_actor,
                  observaciones: p.observaciones,
                  detalles: p.detalles as unknown as Prisma.InputJsonValue,
                  // -i ms para mantener orden estable.
                  fecha: new Date(baseTs - (pasosGenerado.length - i)),
                },
              });
            }
          }
        }
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
   * Hard delete de una entrega. Bloqueado si tiene pago. CASCADE limpia
   * historial y detalles.
   */
  async remove(id: number, departamentoActivo: number | null) {
    const existente = await this.prisma.transaccion.findUnique({
      where: { id },
      include: {
        pago_transaccion: { select: { id: true } },
        recolector: { select: { departamento_id: true } },
        detalle_transaccion: {
          select: {
            sucursal: { select: { departamento_id: true } },
          },
        },
      },
    });
    if (!existente) throw new NotFoundException('Entrega no encontrada');

    if (departamentoActivo != null) {
      const deptoTransaccion =
        existente.recolector?.departamento_id ??
        existente.detalle_transaccion.find((d) => d.sucursal != null)
          ?.sucursal?.departamento_id ??
        null;
      if (deptoTransaccion !== departamentoActivo) {
        throw new NotFoundException('Entrega no encontrada');
      }
    }

    if (existente.pago_transaccion != null) {
      throw new BadRequestException(
        'No se puede eliminar esta entrega porque ya tiene un pago registrado.',
      );
    }

    await this.prisma.transaccion.delete({ where: { id } });
  }

  // ------------------------------------------------------------------
  // Helpers privados
  // ------------------------------------------------------------------

  private validarUnicidadDestino(
    centroOperacionalId?: number | null,
    acopiadorExternoId?: number | null,
    destinoDesconocido?: boolean,
  ): void {
    const count =
      (centroOperacionalId != null ? 1 : 0) +
      (acopiadorExternoId != null ? 1 : 0) +
      (destinoDesconocido === true ? 1 : 0);
    if (count > 1) {
      throw new BadRequestException(
        'Solo se puede indicar un destino: centro operacional, acopiador externo o desconocido (no varios al mismo tiempo)',
      );
    }
  }

  private async verificarExternoActivo(
    tx: Prisma.TransactionClient,
    externoId: number,
  ): Promise<void> {
    const externo = await tx.acopiador_comprador_externo.findUnique({
      where: { id: externoId },
      select: { id: true, activo: true },
    });
    if (!externo) {
      throw new BadRequestException('Acopiador/Comprador externo no encontrado');
    }
    if (!externo.activo) {
      throw new BadRequestException('Acopiador/Comprador externo inactivo');
    }
  }

  /**
   * Valida que todas las sucursales presentes en los detalles pertenezcan
   * al mismo departamento que el recolector. Las líneas sin sucursal_id se
   * ignoran (origen no identificado, permitido).
   */
  private async validarSucursalesDeDetalles(
    tx: Prisma.TransactionClient,
    detalles: DetalleTransaccionDto[],
    recolectorId: number,
  ): Promise<void> {
    const sucursalIds = [
      ...new Set(
        detalles
          .filter((d) => d.sucursal_id != null)
          .map((d) => d.sucursal_id as number),
      ),
    ];
    if (sucursalIds.length === 0) return;

    const recolector = await tx.recolector.findUnique({
      where: { id: recolectorId },
      select: { departamento_id: true },
    });
    if (!recolector) {
      throw new BadRequestException('Recolector no encontrado');
    }

    const sucursales = await tx.sucursal.findMany({
      where: { id: { in: sucursalIds } },
      select: { id: true, departamento_id: true },
    });
    if (sucursales.length !== sucursalIds.length) {
      throw new BadRequestException('Alguna sucursal indicada no existe');
    }
    for (const s of sucursales) {
      if (s.departamento_id !== recolector.departamento_id) {
        throw new ForbiddenException(
          'Alguna sucursal pertenece a un departamento distinto al del recolector',
        );
      }
    }
  }

  /**
   * Construye los pasos GENERADO automáticos del historial: uno por cada
   * sucursal distinta presente en los detalles. Cada paso lleva el subset
   * de materiales que vinieron de esa sucursal y como actor al usuario
   * generador dueño de la sucursal.
   *
   * Devuelve un array vacío si ningún detalle tiene `sucursal_id` (origen
   * no identificado).
   */
  private async buildPasosGeneradoAuto(
    tx: Prisma.TransactionClient,
    detalles: DetalleTransaccionDto[],
  ): Promise<HistorialCreate[]> {
    const grupos = new Map<number, DetalleTransaccionDto[]>();
    for (const d of detalles) {
      if (d.sucursal_id == null) continue;
      const arr = grupos.get(d.sucursal_id) ?? [];
      arr.push(d);
      grupos.set(d.sucursal_id, arr);
    }
    if (grupos.size === 0) return [];

    const sucursalIds = [...grupos.keys()];
    const sucursales = await tx.sucursal.findMany({
      where: { id: { in: sucursalIds } },
      include: { generador: { select: { usuario_id: true } } },
    });
    const generadorPorSucursal = new Map(
      sucursales.map((s) => [s.id, s.generador.usuario_id]),
    );

    return sucursalIds.map((sucursalId) => {
      const detallesDeEsta = grupos.get(sucursalId)!;
      const usuarioGenerador = generadorPorSucursal.get(sucursalId)!;
      return {
        estado: 'GENERADO' as estado_transaccion,
        actor_id: usuarioGenerador,
        rol_actor: 'GENERADOR' as rol_usuario,
        observaciones: undefined,
        detalles: {
          materiales: detallesDeEsta.map((d) => ({
            material_id: d.material_id,
            cantidad: d.cantidad ?? 0,
            unidad_medida: d.unidad_medida,
            precio_unitario: undefined as number | undefined,
          })),
          sucursal_id: sucursalId,
        },
      };
    });
  }

  /**
   * Deriva el departamento al que pertenece una transacción para fines de
   * scope del admin. Prioridad: (a) departamento del recolector si existe;
   * (b) departamento de la primera sucursal asignada en algún detalle.
   * Devuelve null si no se puede determinar.
   */
  private async derivarDeptoDeTransaccion(
    prisma: PrismaService | Prisma.TransactionClient,
    transaccionId: number,
    recolectorId: number | null,
  ): Promise<number | null> {
    if (recolectorId != null) {
      const r = await prisma.recolector.findUnique({
        where: { id: recolectorId },
        select: { departamento_id: true },
      });
      return r?.departamento_id ?? null;
    }
    const detalle = await prisma.detalle_transaccion.findFirst({
      where: {
        transaccion_id: transaccionId,
        sucursal_id: { not: null },
      },
      select: { sucursal: { select: { departamento_id: true } } },
    });
    return detalle?.sucursal?.departamento_id ?? null;
  }
}
