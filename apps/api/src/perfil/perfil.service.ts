import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { rol_usuario } from '@prisma/client';
import { PrismaService } from '../prisma';
import { UpdatePerfilDto } from './dto';

@Injectable()
export class PerfilService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener el perfil del usuario logueado según su rol.
   */
  async getMyProfile(userId: number, userRol: rol_usuario) {
    if (userRol === 'RECOLECTOR') {
      return this.getRecolectorProfile(userId);
    }
    if (userRol === 'ACOPIADOR') {
      return this.getAcopiadorProfile(userId);
    }
    if (userRol === 'GENERADOR') {
      return this.getGeneradorProfile(userId);
    }
    if (userRol === 'ADMIN') {
      return this.getAdminProfile(userId);
    }
    throw new ForbiddenException('Rol no soportado');
  }

  /**
   * Actualizar perfil del usuario logueado. Solo campos permitidos según rol.
   */
  async updateMyProfile(
    userId: number,
    userRol: rol_usuario,
    dto: UpdatePerfilDto,
  ) {
    if (userRol === 'RECOLECTOR') {
      return this.updateRecolectorProfile(userId, dto);
    }
    if (userRol === 'ACOPIADOR') {
      return this.updateAcopiadorProfile(userId, dto);
    }
    if (userRol === 'GENERADOR') {
      return this.updateGeneradorProfile(userId, dto);
    }
    if (userRol === 'ADMIN') {
      return this.updateAdminProfile(userId, dto);
    }
    throw new ForbiddenException('Rol no soportado');
  }

  // --- Recolector ---

  private async getRecolectorProfile(userId: number) {
    const recolector = await this.prisma.recolector.findFirst({
      where: { usuario_id: userId },
      include: {
        usuario: { select: { identificador: true, email: true, activo: true } },
        acopiador: { select: { id: true, nombre_completo: true, nombre_punto: true } },
        zona: { select: { id: true, nombre: true } },
        asociacion: { select: { id: true, nombre: true } },
        recolector_dia_trabajo: { select: { dia_semana: true } },
        recolector_material: {
          include: { material: { select: { id: true, nombre: true } } },
        },
        recolector_tipo_generador: {
          include: { tipo_generador: { select: { id: true, nombre: true } } },
        },
      },
    });
    if (!recolector) throw new ForbiddenException('Perfil de recolector no encontrado');
    return { rol: 'RECOLECTOR', ...recolector };
  }

  private async updateRecolectorProfile(userId: number, dto: UpdatePerfilDto) {
    const recolector = await this.prisma.recolector.findFirst({
      where: { usuario_id: userId },
    });
    if (!recolector) throw new ForbiddenException('Perfil de recolector no encontrado');

    // Validar que todos los materiales enviados existen y están activos.
    // Esto evita FK rota al insertar y mensaje P2003 confuso.
    if (dto.materiales !== undefined && dto.materiales.length > 0) {
      const unicos = Array.from(new Set(dto.materiales));
      const existentes = await this.prisma.material.findMany({
        where: { id: { in: unicos }, activo: true },
        select: { id: true },
      });
      if (existentes.length !== unicos.length) {
        const encontrados = existentes.map((m) => m.id);
        const faltantes = unicos.filter((id) => !encontrados.includes(id));
        throw new BadRequestException(
          `Materiales no encontrados: ${faltantes.join(', ')}`,
        );
      }
    }

    // Todo en una transacción: campos simples + N:N (días y materiales).
    // Si cualquier parte falla, se revierte todo.
    await this.prisma.$transaction(async (tx) => {
      // 1) Campos simples del recolector
      const data: Record<string, unknown> = {};
      if (dto.celular !== undefined) data.celular = dto.celular;
      if (dto.direccion_domicilio !== undefined) {
        data.direccion_domicilio = dto.direccion_domicilio;
      }
      if (dto.latitud !== undefined) data.latitud = dto.latitud;
      if (dto.longitud !== undefined) data.longitud = dto.longitud;

      if (Object.keys(data).length > 0) {
        await tx.recolector.update({
          where: { id: recolector.id },
          data,
        });
      }

      // 2) Días de trabajo: mismo patrón que el CRUD admin
      // (delete-all + create-many). Permite enviar [] para vaciar.
      if (dto.dias_trabajo !== undefined) {
        await tx.recolector_dia_trabajo.deleteMany({
          where: { recolector_id: recolector.id },
        });
        if (dto.dias_trabajo.length > 0) {
          // Deduplicar por si el cliente envía duplicados; la BD tiene
          // UNIQUE(recolector_id, dia_semana).
          const diasUnicos = Array.from(new Set(dto.dias_trabajo));
          await tx.recolector_dia_trabajo.createMany({
            data: diasUnicos.map((dia) => ({
              recolector_id: recolector.id,
              dia_semana: dia,
            })),
          });
        }
      }

      // 3) Materiales: el recolector envía solo IDs. Mantenemos
      // cantidad_mensual, precio_venta y es_principal bajo control del admin.
      // Para las filas nuevas: cantidad y precio como null, es_principal=false
      // (default de la tabla).
      if (dto.materiales !== undefined) {
        await tx.recolector_material.deleteMany({
          where: { recolector_id: recolector.id },
        });
        if (dto.materiales.length > 0) {
          const idsUnicos = Array.from(new Set(dto.materiales));
          await tx.recolector_material.createMany({
            data: idsUnicos.map((materialId) => ({
              recolector_id: recolector.id,
              material_id: materialId,
              cantidad_mensual: null,
              precio_venta: null,
              es_principal: false,
            })),
          });
        }
      }
    });

    return this.getRecolectorProfile(userId);
  }

  // --- Acopiador ---

  private async getAcopiadorProfile(userId: number) {
    const acopiador = await this.prisma.acopiador.findFirst({
      where: { usuario_id: userId },
      include: {
        usuario: { select: { identificador: true, email: true, activo: true } },
        zona: { select: { id: true, nombre: true } },
      },
    });
    if (!acopiador) throw new ForbiddenException('Perfil de acopiador no encontrado');
    return { rol: 'ACOPIADOR', ...acopiador };
  }

  private async updateAcopiadorProfile(userId: number, dto: UpdatePerfilDto) {
    const acopiador = await this.prisma.acopiador.findFirst({
      where: { usuario_id: userId },
    });
    if (!acopiador) throw new ForbiddenException('Perfil de acopiador no encontrado');

    const data: Record<string, unknown> = {};
    if (dto.celular !== undefined) data.celular = dto.celular;
    if (dto.direccion !== undefined) data.direccion = dto.direccion;
    if (dto.latitud !== undefined) data.latitud = dto.latitud;
    if (dto.longitud !== undefined) data.longitud = dto.longitud;
    if (dto.horario_operacion !== undefined) data.horario_operacion = dto.horario_operacion;

    if (Object.keys(data).length === 0) return this.getAcopiadorProfile(userId);

    await this.prisma.acopiador.update({
      where: { id: acopiador.id },
      data,
    });

    return this.getAcopiadorProfile(userId);
  }

  // --- Generador ---

  private async getGeneradorProfile(userId: number) {
    const generador = await this.prisma.generador.findFirst({
      where: { usuario_id: userId },
      include: {
        usuario: { select: { identificador: true, email: true, activo: true } },
        tipo_generador: { select: { id: true, nombre: true } },
        sucursal: {
          where: { activo: true },
          include: {
            zona: { select: { id: true, nombre: true } },
            sucursal_horario: {
              select: { id: true, dia_semana: true, hora_inicio: true, hora_fin: true },
              orderBy: { id: 'asc' },
            },
          },
        },
      },
    });
    if (!generador) throw new ForbiddenException('Perfil de generador no encontrado');
    return { rol: 'GENERADOR', ...generador };
  }

  private async updateGeneradorProfile(userId: number, dto: UpdatePerfilDto) {
    const generador = await this.prisma.generador.findFirst({
      where: { usuario_id: userId },
    });
    if (!generador) throw new ForbiddenException('Perfil de generador no encontrado');

    const data: Record<string, unknown> = {};
    if (dto.contacto_nombre !== undefined) data.contacto_nombre = dto.contacto_nombre;
    if (dto.contacto_telefono !== undefined) data.contacto_telefono = dto.contacto_telefono;
    if (dto.contacto_email !== undefined) data.contacto_email = dto.contacto_email;

    if (Object.keys(data).length === 0) return this.getGeneradorProfile(userId);

    await this.prisma.generador.update({
      where: { id: generador.id },
      data,
    });

    return this.getGeneradorProfile(userId);
  }

  // --- Admin ---

  private async getAdminProfile(userId: number) {
    const admin = await this.prisma.administrador.findFirst({
      where: { usuario_id: userId },
      include: {
        usuario: { select: { identificador: true, email: true, activo: true } },
      },
    });
    if (!admin) throw new ForbiddenException('Perfil de administrador no encontrado');
    return { rol: 'ADMIN', ...admin };
  }

  private async updateAdminProfile(userId: number, dto: UpdatePerfilDto) {
    const admin = await this.prisma.administrador.findFirst({
      where: { usuario_id: userId },
    });
    if (!admin) throw new ForbiddenException('Perfil de administrador no encontrado');

    const data: Record<string, unknown> = {};
    if (dto.celular !== undefined) data.telefono = dto.celular;

    if (Object.keys(data).length === 0) return this.getAdminProfile(userId);

    await this.prisma.administrador.update({
      where: { id: admin.id },
      data,
    });

    return this.getAdminProfile(userId);
  }
}
