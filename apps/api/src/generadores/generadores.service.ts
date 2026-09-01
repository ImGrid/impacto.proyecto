import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { CreateGeneradorDto, UpdateGeneradorDto, GeneradorQueryDto } from './dto';

@Injectable()
export class GeneradoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateGeneradorDto) {
    const password_hash = await argon2.hash(dto.password);

    return this.prisma.usuario.create({
      data: {
        email: dto.email || null,
        identificador: dto.contacto_telefono,
        password_hash,
        rol: 'GENERADOR',
        generador: {
          create: {
            razon_social: dto.razon_social,
            tipo_generador_id: dto.tipo_generador_id,
            contacto_nombre: dto.contacto_nombre,
            contacto_telefono: dto.contacto_telefono,
            contacto_email: dto.contacto_email,
            latitud: dto.latitud,
            longitud: dto.longitud,
          },
        },
      },
      select: {
        id: true,
        email: true,
        rol: true,
        activo: true,
        fecha_creacion: true,
        generador: {
          include: { tipo_generador: true },
        },
      },
    });
  }

  async findAll(query: GeneradorQueryDto) {
    const where: Prisma.generadorWhereInput = {
      activo: query.activo,
      tipo_generador_id: query.tipo_generador_id,
      ...(query.search
        ? { razon_social: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.generador.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { razon_social: query.sortOrder },
        include: {
          usuario: { select: { email: true, activo: true } },
          tipo_generador: true,
        },
      }),
      this.prisma.generador.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findAllForMap() {
    return this.prisma.generador.findMany({
      select: {
        id: true,
        razon_social: true,
        latitud: true,
        longitud: true,
        activo: true,
        tipo_generador: { select: { nombre: true } },
      },
      orderBy: { razon_social: 'asc' },
    });
  }

  async findOne(id: number) {
    const generador = await this.prisma.generador.findUnique({
      where: { id },
      include: {
        usuario: { select: { email: true, activo: true } },
        tipo_generador: true,
      },
    });

    if (!generador) throw new NotFoundException('Generador no encontrado');
    return generador;
  }

  async update(id: number, dto: UpdateGeneradorDto) {
    const generador = await this.findOne(id);
    const { activo, ...generadorData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // El generador INICIA SESIÓN con su teléfono de contacto:
      // `usuario.identificador` es una copia de `generador.contacto_telefono`
      // hecha al crearlo. Si el administrador corrige el teléfono hay que
      // mover los dos, o el generador sigue entrando con el número viejo
      // mientras la web muestra el nuevo, sin que nadie se entere.
      const telefonoNuevo = generadorData.contacto_telefono;
      const cambiaTelefono =
        telefonoNuevo !== undefined &&
        telefonoNuevo !== generador.contacto_telefono;

      if (cambiaTelefono) {
        // Cuidado con esta asimetría: `generador.contacto_telefono` NO es
        // único (dos generadores pueden compartir teléfono), pero
        // `usuario.identificador` SÍ lo es. En los datos reales hay teléfonos
        // de relleno repetibles como "0" o "00", así que este choque va a
        // ocurrir. Se comprueba antes para explicarlo en castellano en vez de
        // devolver el error crudo de la base de datos.
        const ocupado = await tx.usuario.findFirst({
          where: {
            identificador: telefonoNuevo,
            id: { not: generador.usuario_id },
          },
          select: { id: true },
        });
        if (ocupado) {
          throw new BadRequestException(
            `Ya existe otro usuario que inicia sesión con "${telefonoNuevo}". Use otro teléfono de contacto.`,
          );
        }

        await tx.usuario.update({
          where: { id: generador.usuario_id },
          data: { identificador: telefonoNuevo },
        });
      }

      if (Object.keys(generadorData).length > 0) {
        await tx.generador.update({
          where: { id },
          data: generadorData,
        });
      }

      if (activo !== undefined) {
        await tx.generador.update({
          where: { id },
          data: { activo },
        });
        await tx.usuario.update({
          where: { id: generador.usuario_id },
          data: { activo },
        });
      }

      return tx.generador.findUniqueOrThrow({
        where: { id },
        include: {
          usuario: { select: { email: true, activo: true } },
          tipo_generador: true,
        },
      });
    });
  }

  async hardDelete(id: number) {
    const generador = await this.findOne(id);
    await this.prisma.usuario.delete({
      where: { id: generador.usuario_id },
    });
  }

  /**
   * El administrador le asigna una contraseña nueva al generador.
   *
   * Se cierran todas sus sesiones abiertas: si el cambio se hace porque
   * alguien más tuvo acceso a la cuenta, dejar viva la sesión anterior lo
   * haría inútil (el refresh token dura 7 días).
   */
  async resetPassword(id: number, password: string) {
    const generador = await this.findOne(id);
    const password_hash = await argon2.hash(password);

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: generador.usuario_id },
        data: { password_hash },
      });
      await tx.sesion_refresh.deleteMany({
        where: { usuario_id: generador.usuario_id },
      });
    });

    // Nunca se devuelve la contraseña ni el hash.
    return {
      id: generador.id,
      razon_social: generador.razon_social,
      identificador: generador.contacto_telefono,
    };
  }
}
