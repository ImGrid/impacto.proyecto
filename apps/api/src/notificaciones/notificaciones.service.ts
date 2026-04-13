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
};

@Injectable()
export class NotificacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
  ) {}

  /**
   * Crear notificación. La lógica varía según el rol:
   * - ADMIN: tipo GENERAL o SISTEMA (lógica original)
   * - GENERADOR: tipo RESIDUOS_DISPONIBLES (necesita sucursal_id)
   * - RECOLECTOR: tipo SOLICITUD_RECOJO (se envía a su acopiador)
   */
  async create(dto: CreateNotificacionDto, userId: number, userRol: rol_usuario) {
    if (userRol === 'GENERADOR') {
      return this.createFromGenerador(dto, userId);
    }

    if (userRol === 'RECOLECTOR') {
      return this.createFromRecolector(dto, userId);
    }

    // ADMIN: lógica original
    return this.createFromAdmin(dto, userId);
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
      include: { acopiador: { select: { usuario_id: true } } },
    });
    if (!recolector) throw new ForbiddenException('Recolector no encontrado');

    const notificacion = await this.prisma.notificacion.create({
      data: {
        tipo: 'SOLICITUD_RECOJO',
        emisor_id: userId,
        receptor_id: recolector.acopiador.usuario_id,
        zona_id: recolector.zona_id,
        evento_id: null,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
      },
      include: notificacionInclude,
    });

    // Enviar push al acopiador
    this.fcm.sendToUser(recolector.acopiador.usuario_id, dto.titulo, dto.mensaje ?? '');

    return mapNotificacion(notificacion);
  }

  private async createFromAdmin(dto: CreateNotificacionDto, userId: number) {
    const tieneZona = dto.zona_id !== undefined;
    const tieneReceptores =
      dto.receptor_ids !== undefined && dto.receptor_ids.length > 0;

    if (tieneZona && tieneReceptores) {
      throw new BadRequestException(
        'No se puede enviar a una zona y a receptores individuales al mismo tiempo',
      );
    }

    if (tieneZona) {
      const zona = await this.prisma.zona.findUnique({
        where: { id: dto.zona_id },
      });
      if (!zona) throw new NotFoundException('Zona no encontrada');
    }

    if (tieneReceptores) {
      const usuarios = await this.prisma.usuario.findMany({
        where: { id: { in: dto.receptor_ids } },
        select: { id: true },
      });
      if (usuarios.length !== dto.receptor_ids!.length) {
        throw new BadRequestException('Uno o más receptores no existen');
      }
    }

    const tipo = tieneReceptores ? 'SISTEMA' : 'GENERAL';

    if (tieneReceptores) {
      const notificaciones = await this.prisma.$transaction(
        dto.receptor_ids!.map((receptorId) =>
          this.prisma.notificacion.create({
            data: {
              tipo,
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

      // Enviar push a cada receptor
      for (const receptorId of dto.receptor_ids!) {
        this.fcm.sendToUser(receptorId, dto.titulo, dto.mensaje ?? '');
      }

      return notificaciones.map(mapNotificacion);
    }

    const notificacion = await this.prisma.notificacion.create({
      data: {
        tipo,
        emisor_id: userId,
        receptor_id: null,
        zona_id: dto.zona_id ?? null,
        evento_id: null,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
      },
      include: notificacionInclude,
    });

    // Enviar push a la zona si tiene zona
    if (dto.zona_id) {
      this.fcm.sendToZone(dto.zona_id, dto.titulo, dto.mensaje ?? '');
    }

    return mapNotificacion(notificacion);
  }

  /**
   * Listar todas las notificaciones (para ADMIN en el panel web).
   */
  async findAll(query: NotificacionQueryDto) {
    const where: Prisma.notificacionWhereInput = {
      tipo: query.tipo ?? { not: 'EVENTO' },
      ...(query.zona_id ? { zona_id: query.zona_id } : {}),
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

  async findOne(id: number) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id },
      include: notificacionInclude,
    });
    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return mapNotificacion(notificacion);
  }

  /**
   * Marcar notificación como leída.
   */
  async markAsRead(id: number, userId: number) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id },
    });
    if (!notificacion) throw new NotFoundException('Notificación no encontrada');

    return this.prisma.notificacion.update({
      where: { id },
      data: { leida: true, fecha_lectura: new Date() },
    });
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    await this.prisma.notificacion.delete({ where: { id } });
  }
}
