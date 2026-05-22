import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, rol_usuario } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { FcmService } from '../common/services/fcm.service';
import { CreateNotificacionDto, NotificacionQueryDto } from './dto';

// Mapeo legible de relaciones Prisma para la respuesta
function mapNotificacion(n: any) {
  return {
    id: n.id,
    tipo: n.tipo,
    titulo: n.titulo,
    mensaje: n.mensaje,
    leida: n.leida,
    fecha_creacion: n.fecha_creacion,
    fecha_lectura: n.fecha_lectura,
    zona: n.zona,
    emisor: n.usuario_notificacion_emisor_idTousuario,
    receptor: n.usuario_notificacion_receptor_idTousuario,
    evento_id: n.evento_id,
    evento: n.evento ?? null,
  };
}

const notificacionInclude = {
  zona: { select: { id: true, nombre: true } },
  usuario_notificacion_emisor_idTousuario: {
    select: { id: true, identificador: true, email: true },
  },
  usuario_notificacion_receptor_idTousuario: {
    select: { id: true, identificador: true, email: true },
  },
  evento: {
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      direccion: true,
      latitud: true,
      longitud: true,
      fecha_evento: true,
      hora_inicio: true,
      hora_fin: true,
    },
  },
};

@Injectable()
export class NotificacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  /**
   * Crear notificación. La lógica varía según el rol:
   * - ADMIN: tipo GENERAL (broadcast por zona) o SISTEMA (a receptores individuales).
   * - GENERADOR: tipo RESIDUOS_DISPONIBLES (broadcast a recolectores de la zona
   *   de la sucursal).
   * - RECOLECTOR: tipo SOLICITUD_RECOJO (broadcast a TODOS los centros
   *   operacionales activos del departamento del recolector). El vínculo
   *   fijo recolector ↔ acopiador desapareció; cualquier centro del depto
   *   puede tomar la solicitud.
   */
  async create(
    dto: CreateNotificacionDto,
    userId: number,
    userRol: rol_usuario,
    departamentoActivo: number | null,
  ) {
    if (userRol === 'GENERADOR') {
      return this.createFromGenerador(dto, userId);
    }

    if (userRol === 'RECOLECTOR') {
      return this.createFromRecolector(dto, userId);
    }

    if (userRol === 'ADMIN') {
      return this.createFromAdmin(dto, userId, departamentoActivo);
    }

    throw new ForbiddenException('Rol no permitido para crear notificaciones');
  }

  private async createFromGenerador(dto: CreateNotificacionDto, userId: number) {
    if (!dto.sucursal_id) {
      throw new BadRequestException('La sucursal es obligatoria para notificar residuos disponibles');
    }

    // Verificar que la sucursal pertenece al generador
    const generador = await this.prisma.generador.findFirst({
      where: { usuario_id: userId },
    });
    if (!generador) throw new ForbiddenException('Generador no encontrado');

    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id: dto.sucursal_id, generador_id: generador.id },
      include: { zona: { select: { id: true, nombre: true } } },
    });
    if (!sucursal) throw new BadRequestException('La sucursal no pertenece a este generador');

    const notificacion = await this.prisma.notificacion.create({
      data: {
        tipo: 'RESIDUOS_DISPONIBLES',
        emisor_id: userId,
        receptor_id: null,
        zona_id: sucursal.zona_id,
        evento_id: null,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
      },
      include: notificacionInclude,
    });

    // Enviar push a recolectores de la zona
    this.fcm.sendToZone(sucursal.zona_id, dto.titulo, dto.mensaje ?? '');

    return mapNotificacion(notificacion);
  }

  private async createFromRecolector(dto: CreateNotificacionDto, userId: number) {
    const recolector = await this.prisma.recolector.findFirst({
      where: { usuario_id: userId },
      select: { id: true, departamento_id: true, zona_id: true },
    });
    if (!recolector) throw new ForbiddenException('Recolector no encontrado');

    // Broadcast a TODOS los centros operacionales activos del depto del
    // recolector. El vínculo fijo recolector ↔ acopiador desapareció;
    // cualquier centro del depto puede recibir esta solicitud y atenderla.
    const centrosDelDepto = await this.prisma.centro_operacional.findMany({
      where: {
        departamento_id: recolector.departamento_id,
        activo: true,
      },
      select: { usuario_id: true },
    });

    if (centrosDelDepto.length === 0) {
      throw new BadRequestException(
        'No hay centros operacionales activos en tu departamento. Contacta al administrador.',
      );
    }

    // Una notificación por destinatario: permite tracking individual de
    // lectura ("este centro la vio, este no") y respeta el patrón existente
    // del admin con receptor_ids.
    const notificaciones = await this.prisma.$transaction(
      centrosDelDepto.map((centro) =>
        this.prisma.notificacion.create({
          data: {
            tipo: 'SOLICITUD_RECOJO',
            emisor_id: userId,
            receptor_id: centro.usuario_id,
            zona_id: recolector.zona_id,
            evento_id: null,
            titulo: dto.titulo,
            mensaje: dto.mensaje,
          },
          include: notificacionInclude,
        }),
      ),
    );

    // Push a cada centro operacional.
    for (const centro of centrosDelDepto) {
      this.fcm.sendToUser(centro.usuario_id, dto.titulo, dto.mensaje ?? '');
    }

    // Devolver la primera notificación como representativa del envío. El
    // contrato del endpoint sigue siendo "objeto único"; las copias
    // adicionales son tracking interno por destinatario.
    return mapNotificacion(notificaciones[0]);
  }

  private async createFromAdmin(
    dto: CreateNotificacionDto,
    userId: number,
    departamentoActivo: number | null,
  ) {
    const tieneZona = dto.zona_id !== undefined;
    const tieneReceptores =
      dto.receptor_ids !== undefined && dto.receptor_ids.length > 0;

    if (tieneZona && tieneReceptores) {
      throw new BadRequestException(
        'No se puede enviar a una zona y a receptores individuales al mismo tiempo',
      );
    }

    // --- MODO "POR ZONA": broadcast a los recolectores de una zona ---
    if (tieneZona) {
      const zona = await this.prisma.zona.findUnique({
        where: { id: dto.zona_id },
        select: { id: true, ciudad: { select: { departamento_id: true } } },
      });
      if (!zona) throw new NotFoundException('Zona no encontrada');
      // La zona elegida debe pertenecer al departamento activo del admin.
      if (
        departamentoActivo != null &&
        zona.ciudad.departamento_id !== departamentoActivo
      ) {
        throw new BadRequestException(
          'La zona seleccionada no pertenece a su departamento activo',
        );
      }

      const notificacion = await this.prisma.notificacion.create({
        data: {
          tipo: 'GENERAL',
          emisor_id: userId,
          receptor_id: null,
          zona_id: dto.zona_id,
          evento_id: null,
          titulo: dto.titulo,
          mensaje: dto.mensaje,
        },
        include: notificacionInclude,
      });

      this.fcm.sendToZone(dto.zona_id!, dto.titulo, dto.mensaje ?? '');
      return mapNotificacion(notificacion);
    }

    // --- MODO "INDIVIDUAL": notificación directa a recolectoras concretas ---
    if (tieneReceptores) {
      // Cada receptor debe ser una recolectora del departamento activo.
      const recolectores = await this.prisma.recolector.findMany({
        where: { usuario_id: { in: dto.receptor_ids } },
        select: { usuario_id: true, departamento_id: true },
      });
      if (recolectores.length !== dto.receptor_ids!.length) {
        throw new BadRequestException(
          'Uno o más destinatarios no son recolectoras válidas',
        );
      }
      if (departamentoActivo != null) {
        const ajeno = recolectores.find(
          (r) => r.departamento_id !== departamentoActivo,
        );
        if (ajeno) {
          throw new BadRequestException(
            'Uno o más destinatarios no pertenecen a su departamento activo',
          );
        }
      }

      const notificaciones = await this.prisma.$transaction(
        dto.receptor_ids!.map((receptorId) =>
          this.prisma.notificacion.create({
            data: {
              tipo: 'SISTEMA',
              emisor_id: userId,
              receptor_id: receptorId,
              zona_id: null,
              evento_id: null,
              titulo: dto.titulo,
              mensaje: dto.mensaje,
            },
            include: notificacionInclude,
          }),
        ),
      );

      for (const receptorId of dto.receptor_ids!) {
        this.fcm.sendToUser(receptorId, dto.titulo, dto.mensaje ?? '');
      }

      return notificaciones.map(mapNotificacion);
    }

    // --- MODO "GENERAL": a TODAS las recolectoras del departamento activo ---
    if (departamentoActivo == null) {
      throw new BadRequestException(
        'No hay un departamento activo en la sesión para enviar una notificación general',
      );
    }
    const recolectoresDelDepto = await this.prisma.recolector.findMany({
      where: { departamento_id: departamentoActivo, activo: true },
      select: { usuario_id: true },
    });
    if (recolectoresDelDepto.length === 0) {
      throw new BadRequestException(
        'No hay recolectoras activas en su departamento.',
      );
    }

    // Una notificación directa por recolectora: así cada una la ve en su app
    // (findMine filtra por receptor_id) y se le envía push individual.
    const notificaciones = await this.prisma.$transaction(
      recolectoresDelDepto.map((r) =>
        this.prisma.notificacion.create({
          data: {
            tipo: 'GENERAL',
            emisor_id: userId,
            receptor_id: r.usuario_id,
            zona_id: null,
            evento_id: null,
            titulo: dto.titulo,
            mensaje: dto.mensaje,
          },
          include: notificacionInclude,
        }),
      ),
    );

    for (const r of recolectoresDelDepto) {
      this.fcm.sendToUser(r.usuario_id, dto.titulo, dto.mensaje ?? '');
    }

    return mapNotificacion(notificaciones[0]);
  }

  /**
   * Listar todas las notificaciones (para ADMIN en el panel web).
   * Filtra por departamento activo del admin: las notificaciones tienen
   * zona_id, la zona pertenece a una ciudad que pertenece a un depto.
   */
  async findAll(query: NotificacionQueryDto, departamentoActivo: number | null) {
    const where: Prisma.notificacionWhereInput = {
      tipo: query.tipo ?? { not: 'EVENTO' },
      ...(query.zona_id ? { zona_id: query.zona_id } : {}),
      ...(departamentoActivo != null
        ? { zona: { ciudad: { departamento_id: departamentoActivo } } }
        : {}),
      ...(query.search
        ? { titulo: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificacion.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { fecha_creacion: 'desc' },
        include: notificacionInclude,
      }),
      this.prisma.notificacion.count({ where }),
    ]);

    return new PaginatedResponseDto(
      data.map(mapNotificacion),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Mis notificaciones (para la app móvil).
   * Filtra según el rol y la zona del usuario.
   */
  async findMine(
    query: NotificacionQueryDto,
    userId: number,
    userRol: rol_usuario,
  ) {
    const where: Prisma.notificacionWhereInput = {};

    if (userRol === 'RECOLECTOR') {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
      });
      if (!recolector) throw new ForbiddenException('Recolector no encontrado');

      // Notificaciones directas a mí O broadcast a mi zona
      where.OR = [
        { receptor_id: userId },
        { zona_id: recolector.zona_id, receptor_id: null },
      ];
    } else if (userRol === 'ACOPIADOR') {
      // Solo notificaciones directas (solicitudes de recojo)
      where.receptor_id = userId;
    } else if (userRol === 'GENERADOR') {
      // Solo notificaciones directas
      where.receptor_id = userId;
    } else {
      throw new ForbiddenException('Use el endpoint /notificaciones para administradores');
    }

    if (query.search) {
      where.titulo = { contains: query.search, mode: 'insensitive' as const };
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificacion.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { fecha_creacion: 'desc' },
        include: notificacionInclude,
      }),
      this.prisma.notificacion.count({ where }),
    ]);

    return new PaginatedResponseDto(
      data.map(mapNotificacion),
      total,
      query.page,
      query.limit,
    );
  }

  /**
   * Detalle de una notificación.
   * Valida ownership (OWASP API1:2023 BOLA), mismo criterio que markAsRead:
   * - ADMIN: acceso completo (panel web).
   * - Directa (receptor_id seteado): solo el destinatario.
   * - Broadcast (receptor_id null): solo un recolector cuya zona coincida.
   */
  async findOne(id: number, userId: number, userRol: rol_usuario) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id },
      include: notificacionInclude,
    });
    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }

    if (userRol !== 'ADMIN') {
      if (notificacion.receptor_id !== null) {
        // Notificación directa: solo el destinatario.
        if (notificacion.receptor_id !== userId) {
          throw new ForbiddenException('No tiene acceso a esta notificación');
        }
      } else {
        // Broadcast: solo un recolector de la misma zona.
        if (userRol !== 'RECOLECTOR') {
          throw new ForbiddenException('No tiene acceso a esta notificación');
        }
        const recolector = await this.prisma.recolector.findFirst({
          where: { usuario_id: userId },
        });
        if (
          !recolector ||
          notificacion.zona_id === null ||
          recolector.zona_id !== notificacion.zona_id
        ) {
          throw new ForbiddenException('No tiene acceso a esta notificación');
        }
      }
    }

    return mapNotificacion(notificacion);
  }

  /**
   * Marcar notificación como leída.
   * Valida ownership (OWASP API1:2023 BOLA):
   * - Directa (receptor_id seteado): solo el receptor puede marcarla.
   * - Broadcast (receptor_id null): solo un recolector cuya zona coincida
   *   con zona_id de la notificación (los demás roles no ven broadcasts).
   */
  async markAsRead(id: number, userId: number, userRol: rol_usuario) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id },
    });
    if (!notificacion) throw new NotFoundException('Notificación no encontrada');

    if (notificacion.receptor_id !== null) {
      // Notificación directa: solo el destinatario.
      if (notificacion.receptor_id !== userId) {
        throw new ForbiddenException('No tiene acceso a esta notificación');
      }
    } else {
      // Broadcast: solo un recolector de la misma zona.
      if (userRol !== 'RECOLECTOR') {
        throw new ForbiddenException('No tiene acceso a esta notificación');
      }
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
      });
      if (
        !recolector ||
        notificacion.zona_id === null ||
        recolector.zona_id !== notificacion.zona_id
      ) {
        throw new ForbiddenException('No tiene acceso a esta notificación');
      }
    }

    return this.prisma.notificacion.update({
      where: { id },
      data: { leida: true, fecha_lectura: new Date() },
    });
  }

  async hardDelete(id: number) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id },
    });
    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }
    await this.prisma.notificacion.delete({ where: { id } });
  }
}
