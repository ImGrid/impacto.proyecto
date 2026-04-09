import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { CreateEventoDto, UpdateEventoDto, EventoQueryDto } from './dto';

@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventoDto, userId: number) {
    // Obtener el administrador a partir del usuario_id del JWT
    const admin = await this.prisma.administrador.findUnique({
      where: { usuario_id: userId },
    });
    if (!admin) {
      throw new BadRequestException(
        'No se encontró el perfil de administrador asociado a este usuario',
      );
    }

    // Verificar que la zona existe
    const zona = await this.prisma.zona.findUnique({
      where: { id: dto.zona_id },
    });
    if (!zona) {
      throw new NotFoundException('Zona no encontrada');
    }

    // Crear evento + notificación automática en transacción
    return this.prisma.$transaction(async (tx) => {
      const evento = await tx.evento.create({
        data: {
          titulo: dto.titulo,
          descripcion: dto.descripcion,
          zona_id: dto.zona_id,
          direccion: dto.direccion,
          latitud: dto.latitud,
          longitud: dto.longitud,
          fecha_evento: new Date(dto.fecha_evento),
          hora_inicio: dto.hora_inicio ? this.parseTime(dto.hora_inicio) : null,
          hora_fin: dto.hora_fin ? this.parseTime(dto.hora_fin) : null,
          creado_por_id: admin.id,
        },
        include: {
          zona: { select: { id: true, nombre: true } },
          administrador: { select: { id: true, nombre_completo: true } },
        },
      });

      // Crear notificación automática para todos los recolectores de la zona
      await tx.notificacion.create({
        data: {
          tipo: 'EVENTO',
          emisor_id: userId,
          zona_id: dto.zona_id,
          receptor_id: null, // NULL = todos los de la zona
          evento_id: evento.id,
          titulo: dto.titulo,
          mensaje: dto.descripcion,
        },
      });

      return evento;
    });
  }

  async findAll(query: EventoQueryDto) {
    const where: Prisma.eventoWhereInput = {
      activo: query.activo,
      ...(query.zona_id ? { zona_id: query.zona_id } : {}),
      ...(query.search
        ? { titulo: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.evento.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { fecha_evento: 'desc' },
        include: {
          zona: { select: { id: true, nombre: true } },
          administrador: { select: { id: true, nombre_completo: true } },
        },
      }),
      this.prisma.evento.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(id: number) {
    const evento = await this.prisma.evento.findUnique({
      where: { id },
      include: {
        zona: { select: { id: true, nombre: true } },
        administrador: { select: { id: true, nombre_completo: true } },
      },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    return evento;
  }

  async update(id: number, dto: UpdateEventoDto) {
    await this.findOne(id);

    const data: Prisma.eventoUpdateInput = {};
    if (dto.titulo !== undefined) data.titulo = dto.titulo;
    if (dto.descripcion !== undefined) data.descripcion = dto.descripcion;
    if (dto.zona_id !== undefined) data.zona = { connect: { id: dto.zona_id } };
    if (dto.direccion !== undefined) data.direccion = dto.direccion;
    if (dto.latitud !== undefined) data.latitud = dto.latitud;
    if (dto.longitud !== undefined) data.longitud = dto.longitud;
    if (dto.fecha_evento !== undefined) data.fecha_evento = new Date(dto.fecha_evento);
    if (dto.hora_inicio !== undefined) data.hora_inicio = dto.hora_inicio ? this.parseTime(dto.hora_inicio) : null;
    if (dto.hora_fin !== undefined) data.hora_fin = dto.hora_fin ? this.parseTime(dto.hora_fin) : null;

    return this.prisma.evento.update({
      where: { id },
      data,
      include: {
        zona: { select: { id: true, nombre: true } },
        administrador: { select: { id: true, nombre_completo: true } },
      },
    });
  }

  async hardDelete(id: number) {
    await this.findOne(id);

    // Eliminar notificaciones asociadas al evento primero, luego el evento
    await this.prisma.$transaction(async (tx) => {
      await tx.notificacion.deleteMany({
        where: { evento_id: id },
      });
      await tx.evento.delete({ where: { id } });
    });
  }

  /**
   * Convierte un string "HH:mm" a un Date con la hora correspondiente.
   * Prisma espera DateTime para campos @db.Time(6).
   */
  private parseTime(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const date = new Date(1970, 0, 1, hours, minutes, 0);
    return date;
  }
}
