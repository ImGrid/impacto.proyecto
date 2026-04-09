import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { CreateNotificacionDto, NotificacionQueryDto } from './dto';

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNotificacionDto, userId: number) {
    const tieneZona = dto.zona_id !== undefined;
    const tieneReceptores =
      dto.receptor_ids !== undefined && dto.receptor_ids.length > 0;

    // Validar: no puede tener zona Y receptores a la vez
    if (tieneZona && tieneReceptores) {
      throw new BadRequestException(
        'No se puede enviar a una zona y a receptores individuales al mismo tiempo',
      );
    }

    // Validar zona si se proporcionó
    if (tieneZona) {
      const zona = await this.prisma.zona.findUnique({
        where: { id: dto.zona_id },
      });
      if (!zona) throw new NotFoundException('Zona no encontrada');
    }

    // Validar que los receptores existan si se proporcionaron
    if (tieneReceptores) {
      const usuarios = await this.prisma.usuario.findMany({
        where: { id: { in: dto.receptor_ids } },
        select: { id: true },
      });
      if (usuarios.length !== dto.receptor_ids!.length) {
        throw new BadRequestException(
          'Uno o más receptores no existen',
        );
      }
    }

    // Determinar tipo de notificación
    const tipo = tieneReceptores ? 'SISTEMA' : 'GENERAL';

    if (tieneReceptores) {
      // Mensaje individual: crear una notificación por cada receptor
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
            include: {
              usuario_notificacion_receptor_idTousuario: {
                select: { id: true, email: true },
              },
            },
          }),
        ),
      );
      return notificaciones;
    }

    // Mensaje general (todas) o por zona
    return this.prisma.notificacion.create({
      data: {
        tipo,
        emisor_id: userId,
        receptor_id: null,
        zona_id: dto.zona_id ?? null,
        evento_id: null,
        titulo: dto.titulo,
        mensaje: dto.mensaje,
      },
      include: {
        zona: dto.zona_id
          ? { select: { id: true, nombre: true } }
          : false,
      },
    });
  }

  async findAll(query: NotificacionQueryDto) {
    const where: Prisma.notificacionWhereInput = {
      // Excluir notificaciones de tipo EVENTO (se ven en el tab de eventos)
      tipo: query.tipo ?? { not: 'EVENTO' },
      ...(query.zona_id ? { zona_id: query.zona_id } : {}),
      ...(query.search
        ? {
            titulo: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notificacion.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { fecha_creacion: 'desc' },
        include: {
          zona: { select: { id: true, nombre: true } },
          usuario_notificacion_emisor_idTousuario: {
            select: { id: true, email: true },
          },
          usuario_notificacion_receptor_idTousuario: {
            select: { id: true, email: true },
          },
        },
      }),
      this.prisma.notificacion.count({ where }),
    ]);

    // Mapear nombres de relaciones más legibles
    const dataLimpia = data.map((n) => ({
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
    }));

    return new PaginatedResponseDto(dataLimpia, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const notificacion = await this.prisma.notificacion.findUnique({
      where: { id },
      include: {
        zona: { select: { id: true, nombre: true } },
        usuario_notificacion_emisor_idTousuario: {
          select: { id: true, email: true },
        },
        usuario_notificacion_receptor_idTousuario: {
          select: { id: true, email: true },
        },
      },
    });
    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }
    return {
      id: notificacion.id,
      tipo: notificacion.tipo,
      titulo: notificacion.titulo,
      mensaje: notificacion.mensaje,
      leida: notificacion.leida,
      fecha_creacion: notificacion.fecha_creacion,
      fecha_lectura: notificacion.fecha_lectura,
      zona: notificacion.zona,
      emisor: notificacion.usuario_notificacion_emisor_idTousuario,
      receptor: notificacion.usuario_notificacion_receptor_idTousuario,
      evento_id: notificacion.evento_id,
    };
  }

  async hardDelete(id: number) {
    await this.findOne(id);
    await this.prisma.notificacion.delete({ where: { id } });
  }
}
