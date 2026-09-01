import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { normalizarCI, normalizarParaComparar } from '../common/helpers';
import { ImageStorageService } from '../common/services/image-storage.service';
import {
  CreateRecolectorDto,
  UpdateRecolectorDto,
  RecolectorQueryDto,
} from './dto';

const recolectorInclude = {
  usuario: { select: { email: true, activo: true } },
  zona: { select: { id: true, nombre: true } },
  departamento: { select: { id: true, nombre: true } },
  asociacion: { select: { id: true, nombre: true } },
  recolector_dia_trabajo: { select: { dia_semana: true } },
  recolector_material: {
    include: { material: { select: { id: true, nombre: true } } },
  },
  recolector_tipo_generador: {
    include: { tipo_generador: { select: { id: true, nombre: true } } },
  },
} satisfies Prisma.recolectorInclude;

@Injectable()
export class RecolectoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly imageStorage: ImageStorageService,
  ) {}

  async create(
    dto: CreateRecolectorDto,
    departamentoActivo: number | null,
  ) {
    const password_hash = await argon2.hash(dto.password);
    const ciNormalizado = normalizarCI(dto.cedula_identidad);

    // Procesar la foto (si viene) ANTES de la transacción: valida el formato
    // y escribe el archivo en disco. Devuelve la ruta pública para BD.
    const fotoUrl = dto.foto_base64
      ? await this.imageStorage.saveFromBase64(dto.foto_base64, 'recolectores')
      : null;

    try {
      return await this.prisma.$transaction(async (tx) => {
      // El departamento_id se deriva de la zona (zona -> ciudad ->
      // departamento). El cliente ya no lo envía: la zona es la única fuente.
      const zona = await tx.zona.findUnique({
        where: { id: dto.zona_id },
        select: { ciudad: { select: { departamento_id: true } } },
      });
      if (!zona) throw new NotFoundException('Zona no encontrada');

      // Filtro global por depto activo: el recolector debe crearse en el
      // departamento activo de la sesión (a través de la zona elegida).
      if (
        departamentoActivo != null &&
        zona.ciudad.departamento_id !== departamentoActivo
      ) {
        throw new BadRequestException(
          'El recolector debe pertenecer al departamento activo de la sesión',
        );
      }

      // 1. Create usuario + recolector (nested write)
      const usuario = await tx.usuario.create({
        data: {
          email: dto.email || null,
          identificador: ciNormalizado,
          password_hash,
          rol: 'RECOLECTOR',
          recolector: {
            create: {
              nombre_completo: dto.nombre_completo,
              cedula_identidad: ciNormalizado,
              celular: dto.celular,
              direccion_domicilio: dto.direccion_domicilio,
              latitud: dto.latitud,
              longitud: dto.longitud,
              zona_id: dto.zona_id,
              departamento_id: zona.ciudad.departamento_id,
              asociacion_id: dto.asociacion_id,
              genero: dto.genero,
              edad: dto.edad,
              trabaja_individual: dto.trabaja_individual ?? true,
              foto_url: fotoUrl,
            },
          },
        },
        include: {
          recolector: true,
        },
      });

      const recolectorId = usuario.recolector!.id;

      // 2. Días de trabajo
      if (dto.dias_trabajo?.length) {
        await tx.recolector_dia_trabajo.createMany({
          data: dto.dias_trabajo.map((dia) => ({
            recolector_id: recolectorId,
            dia_semana: dia,
          })),
        });
      }

      // 3. Materiales
      if (dto.materiales?.length) {
        this.validarMaterialesOtro(dto.materiales);
        await tx.recolector_material.createMany({
          data: dto.materiales.map((m) => ({
            recolector_id: recolectorId,
            material_id: m.material_id ?? null,
            nombre_personalizado: m.nombre_personalizado?.trim() || null,
            unidad_medida: m.unidad_medida ?? null,
            cantidad_mensual: m.cantidad_mensual,
            precio_venta: m.precio_venta,
            es_principal: m.es_principal ?? false,
          })),
        });
      }

      // 4. Tipos de generador
      if (dto.tipos_generador_ids?.length) {
        await tx.recolector_tipo_generador.createMany({
          data: dto.tipos_generador_ids.map((tipoId) => ({
            recolector_id: recolectorId,
            tipo_generador_id: tipoId,
          })),
        });
      }

      // 5. Return full recolector with all relations
        return tx.recolector.findUniqueOrThrow({
          where: { id: recolectorId },
          include: recolectorInclude,
        });
      });
    } catch (err) {
      // Si la transacción falla, no dejar el archivo de la foto huérfano.
      await this.imageStorage.deleteByPublicPath(fotoUrl);
      throw err;
    }
  }

  async findAll(
    query: RecolectorQueryDto,
    departamentoActivo: number | null,
  ) {
    const where: Prisma.recolectorWhereInput = {
      activo: query.activo,
      zona_id: query.zona_id,
      asociacion_id: query.asociacion_id,
      genero: query.genero,
      trabaja_individual: query.trabaja_individual,
      // Filtro global por departamento activo. Solo se omite si llega null
      // (caso defensivo; los roles que acceden aquí siempre tienen depto).
      ...(departamentoActivo != null
        ? { departamento_id: departamentoActivo }
        : {}),
      ...(query.search
        ? { nombre_completo: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
      ...(query.material_id
        ? { recolector_material: { some: { material_id: query.material_id } } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.recolector.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre_completo: query.sortOrder },
        include: recolectorInclude,
      }),
      this.prisma.recolector.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findAllForMap(departamentoActivo: number | null) {
    return this.prisma.recolector.findMany({
      where: {
        ...(departamentoActivo != null
          ? { departamento_id: departamentoActivo }
          : {}),
      },
      select: {
        id: true,
        nombre_completo: true,
        direccion_domicilio: true,
        latitud: true,
        longitud: true,
        activo: true,
        zona: { select: { nombre: true } },
        departamento: { select: { nombre: true } },
      },
      orderBy: { nombre_completo: 'asc' },
    });
  }

  async findOne(id: number, departamentoActivo: number | null) {
    const recolector = await this.prisma.recolector.findUnique({
      where: { id },
      include: recolectorInclude,
    });

    if (!recolector) throw new NotFoundException('Recolector no encontrado');

    // Scope por departamento activo: si el recolector está en otro depto,
    // desde la vista del caller no existe.
    if (
      departamentoActivo != null &&
      recolector.departamento_id !== departamentoActivo
    ) {
      throw new NotFoundException('Recolector no encontrado');
    }

    return recolector;
  }

  async update(
    id: number,
    dto: UpdateRecolectorDto,
    departamentoActivo: number | null,
  ) {
    // findOne aplica el scope por depto. Si el recolector está en otro
    // departamento, lanza 404 antes de tocar BD.
    const recolector = await this.findOne(id, departamentoActivo);
    const oldFotoUrl = recolector.foto_url;

    // Si cambia la zona, el departamento_id se re-deriva de la nueva zona
    // (zona -> ciudad -> departamento) y debe seguir en el departamento activo.
    let departamentoIdNuevo: number | undefined;
    if (dto.zona_id !== undefined) {
      const zona = await this.prisma.zona.findUnique({
        where: { id: dto.zona_id },
        select: { ciudad: { select: { departamento_id: true } } },
      });
      if (!zona) throw new NotFoundException('Zona no encontrada');
      if (
        departamentoActivo != null &&
        zona.ciudad.departamento_id !== departamentoActivo
      ) {
        throw new BadRequestException(
          'No se puede mover el recolector a una zona de otro departamento',
        );
      }
      departamentoIdNuevo = zona.ciudad.departamento_id;
    }

    // Procesar la nueva foto (si viene) antes de la transacción: valida y
    // escribe el archivo nuevo. La foto anterior se borra recién al confirmar.
    const nuevaFotoUrl =
      dto.foto_base64 !== undefined
        ? await this.imageStorage.saveFromBase64(dto.foto_base64, 'recolectores')
        : undefined;

    // Cambio a aplicar en foto_url: nueva ruta (reemplazo), null (eliminar) o
    // undefined (no tocar). El reemplazo tiene prioridad sobre eliminar.
    const fotoUrlNuevo: string | null | undefined =
      nuevaFotoUrl !== undefined
        ? nuevaFotoUrl
        : dto.foto_eliminar
          ? null
          : undefined;

    try {
      const result = await this.prisma.$transaction(async (tx) => {
      // Extract relation arrays, activo, foto_base64 y foto_eliminar from dto:
      // no son columnas (la foto se persiste aparte como foto_url).
      const { dias_trabajo, materiales, tipos_generador_ids, activo, foto_base64, foto_eliminar, ...recolectorData } = dto;
      void foto_base64;
      void foto_eliminar;

      // La cédula se normaliza igual que al crear (quita espacios: la CI
      // boliviana se escribe "9876543 CB"). Sin esto, editar la cédula desde
      // la web la guardaba con el espacio mientras que al crear se guardaba
      // sin él, y el recolector quedaba sin poder entrar.
      if (recolectorData.cedula_identidad !== undefined) {
        recolectorData.cedula_identidad = normalizarCI(
          recolectorData.cedula_identidad,
        );
      }

      // El recolector INICIA SESIÓN con su cédula: `usuario.identificador` es
      // una copia de `recolector.cedula_identidad` hecha al crearlo. Si el
      // administrador corrige la cédula hay que mover las dos, o la persona
      // sigue entrando con la cédula vieja mientras la web muestra la nueva
      // (ya le pasó a dos recolectoras reales).
      const cedulaNueva = recolectorData.cedula_identidad;
      const cambiaCedula =
        cedulaNueva !== undefined &&
        cedulaNueva !== recolector.cedula_identidad;

      if (cambiaCedula) {
        // `usuario.identificador` es único en toda la tabla, no solo entre
        // recolectores: podría chocar con el email de un centro operacional o
        // con el teléfono de un generador. Se comprueba antes para dar un
        // mensaje claro en vez del error crudo de la base de datos.
        const ocupado = await tx.usuario.findFirst({
          where: {
            identificador: cedulaNueva,
            id: { not: recolector.usuario_id },
          },
          select: { id: true },
        });
        if (ocupado) {
          throw new BadRequestException(
            `Ya existe otro usuario que inicia sesión con "${cedulaNueva}". Use otra cédula.`,
          );
        }

        await tx.usuario.update({
          where: { id: recolector.usuario_id },
          data: { identificador: cedulaNueva },
        });
      }

      // Update recolector fields if any. Si cambió la zona se re-deriva el
      // departamento_id. Si se subió/eliminó la foto, se setea/limpia foto_url.
      if (
        Object.keys(recolectorData).length > 0 ||
        departamentoIdNuevo !== undefined ||
        fotoUrlNuevo !== undefined
      ) {
        await tx.recolector.update({
          where: { id },
          data: {
            ...recolectorData,
            ...(departamentoIdNuevo !== undefined
              ? { departamento_id: departamentoIdNuevo }
              : {}),
            ...(fotoUrlNuevo !== undefined ? { foto_url: fotoUrlNuevo } : {}),
          },
        });
      }

      // Update activo in both tables
      if (activo !== undefined) {
        await tx.recolector.update({
          where: { id },
          data: { activo },
        });
        await tx.usuario.update({
          where: { id: recolector.usuario_id },
          data: { activo },
        });
      }

      // Replace días de trabajo if provided
      if (dias_trabajo !== undefined) {
        await tx.recolector_dia_trabajo.deleteMany({
          where: { recolector_id: id },
        });
        if (dias_trabajo.length > 0) {
          await tx.recolector_dia_trabajo.createMany({
            data: dias_trabajo.map((dia) => ({
              recolector_id: id,
              dia_semana: dia,
            })),
          });
        }
      }

      // Replace materiales if provided
      if (materiales !== undefined) {
        await tx.recolector_material.deleteMany({
          where: { recolector_id: id },
        });
        if (materiales.length > 0) {
          this.validarMaterialesOtro(materiales);
          await tx.recolector_material.createMany({
            data: materiales.map((m) => ({
              recolector_id: id,
              material_id: m.material_id ?? null,
              nombre_personalizado: m.nombre_personalizado?.trim() || null,
              unidad_medida: m.unidad_medida ?? null,
              cantidad_mensual: m.cantidad_mensual,
              precio_venta: m.precio_venta,
              es_principal: m.es_principal ?? false,
            })),
          });
        }
      }

      // Replace tipos generador if provided
      if (tipos_generador_ids !== undefined) {
        await tx.recolector_tipo_generador.deleteMany({
          where: { recolector_id: id },
        });
        if (tipos_generador_ids.length > 0) {
          await tx.recolector_tipo_generador.createMany({
            data: tipos_generador_ids.map((tipoId) => ({
              recolector_id: id,
              tipo_generador_id: tipoId,
            })),
          });
        }
      }

        return tx.recolector.findUniqueOrThrow({
          where: { id },
          include: recolectorInclude,
        });
      });

      // Éxito: borrar el archivo anterior si se reemplazó (nueva ruta) o se
      // eliminó (fotoUrlNuevo = null) la foto.
      if (fotoUrlNuevo !== undefined && oldFotoUrl && oldFotoUrl !== fotoUrlNuevo) {
        await this.imageStorage.deleteByPublicPath(oldFotoUrl);
      }
      return result;
    } catch (err) {
      // Si la transacción falla, borrar el archivo nuevo recién escrito.
      if (nuevaFotoUrl) await this.imageStorage.deleteByPublicPath(nuevaFotoUrl);
      throw err;
    }
  }

  async hardDelete(id: number, departamentoActivo: number | null) {
    const recolector = await this.findOne(id, departamentoActivo);
    await this.prisma.usuario.delete({
      where: { id: recolector.usuario_id },
    });
    // El cascade borró el recolector; limpiar el archivo de su foto.
    await this.imageStorage.deleteByPublicPath(recolector.foto_url);
  }

  /**
   * El administrador le asigna una contraseña nueva al recolector.
   *
   * Es la única forma de recuperar la cuenta: no hay recuperación por correo
   * (la mayoría de los recolectores no tiene email registrado) y el propio
   * recolector no puede cambiarla desde la app.
   *
   * Se cierran todas las sesiones abiertas del usuario. Si la contraseña se
   * está cambiando porque alguien más tuvo acceso a la cuenta, dejar viva la
   * sesión anterior haría inútil el cambio: el refresh token seguiría
   * funcionando durante 7 días.
   */
  async resetPassword(
    id: number,
    password: string,
    departamentoActivo: number | null,
  ) {
    // findOne aplica el scope por departamento: un admin de Cochabamba no
    // puede cambiarle la contraseña a un recolector de La Paz.
    const recolector = await this.findOne(id, departamentoActivo);
    const password_hash = await argon2.hash(password);

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id: recolector.usuario_id },
        data: { password_hash },
      });
      await tx.sesion_refresh.deleteMany({
        where: { usuario_id: recolector.usuario_id },
      });
    });

    // Nunca se devuelve la contraseña ni el hash.
    return {
      id: recolector.id,
      nombre_completo: recolector.nombre_completo,
      identificador: recolector.cedula_identidad,
    };
  }

  /**
   * Valida que cada material del recolector sea O del catálogo (`material_id`)
   * O un "Otro" de texto libre (`nombre_personalizado`), nunca ambos ni
   * ninguno. Coincide con el CHECK de BD `chk_recmat_material_xor_otro`.
   */
  private validarMaterialesOtro(
    materiales: { material_id?: number; nombre_personalizado?: string }[],
  ): void {
    // Nombres "Otro" ya vistos, normalizados (sin mayúsculas/acentos/espacios)
    // para rechazar duplicados como "Pilas" / "pilas" / "Pílas".
    const otrosVistos = new Set<string>();
    for (const m of materiales) {
      const tieneCatalogo = m.material_id != null;
      const tieneOtro =
        m.nombre_personalizado != null && m.nombre_personalizado.trim() !== '';
      if (tieneCatalogo === tieneOtro) {
        throw new BadRequestException(
          'Cada material debe ser del catálogo o un "Otro" con nombre, no ambos ni ninguno',
        );
      }
      if (tieneOtro) {
        const clave = normalizarParaComparar(m.nombre_personalizado as string);
        if (otrosVistos.has(clave)) {
          throw new BadRequestException(
            `Hay dos materiales "Otro" con el mismo nombre ("${(m.nombre_personalizado as string).trim()}"). Use un solo registro o nombres distintos.`,
          );
        }
        otrosVistos.add(clave);
      }
    }
  }
}
