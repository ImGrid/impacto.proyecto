import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, rol_usuario } from '@prisma/client';
import { PrismaService } from '../prisma';
import { PaginatedResponseDto } from '../common/dto';
import { normalizarParaComparar } from '../common/helpers';
import {
  CreateSucursalDto,
  UpdateSucursalDto,
  SucursalQueryDto,
  SucursalHorarioDto,
} from './dto';

// Convierte string "08:00" a Date con fecha base 1970-01-01 (Prisma Time)
function timeStringToDate(time: string): Date {
  return new Date(`1970-01-01T${time}:00.000Z`);
}

function mapHorarios(sucursalId: number, horarios: SucursalHorarioDto[]) {
  return horarios.map((h) => ({
    sucursal_id: sucursalId,
    dia_semana: h.dia_semana,
    hora_inicio: timeStringToDate(h.hora_inicio),
    hora_fin: timeStringToDate(h.hora_fin),
  }));
}

const sucursalInclude = {
  generador: {
    select: { id: true, razon_social: true },
  },
  zona: {
    select: { id: true, nombre: true },
  },
  departamento: {
    select: { id: true, nombre: true },
  },
  sucursal_material: {
    include: { material: { select: { id: true, nombre: true } } },
  },
  sucursal_horario: {
    select: { id: true, dia_semana: true, hora_inicio: true, hora_fin: true },
    orderBy: { id: 'asc' as const },
  },
} satisfies Prisma.sucursalInclude;

@Injectable()
export class SucursalesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    dto: CreateSucursalDto,
    departamentoActivo: number | null,
  ) {
    const { materiales, horarios, ...sucursalData } = dto;

    return this.prisma.$transaction(async (tx) => {
      // Inferir departamento_id desde la zona (zona -> ciudad -> departamento)
      // para garantizar coherencia. Evita que el cliente envíe combinaciones
      // zona+depto inconsistentes.
      const zona = await tx.zona.findUnique({
        where: { id: sucursalData.zona_id },
        select: { ciudad: { select: { departamento_id: true } } },
      });
      if (!zona) throw new NotFoundException('Zona no encontrada');

      // Filtro global por depto activo: la sucursal debe crearse en el depto
      // activo del admin (a través de la zona). Evita que un admin scoped a
      // depto 2 cree sucursales en depto 1 inadvertidamente.
      if (
        departamentoActivo != null &&
        zona.ciudad.departamento_id !== departamentoActivo
      ) {
        throw new BadRequestException(
          'La sucursal debe pertenecer al departamento activo de la sesión',
        );
      }

      const sucursal = await tx.sucursal.create({
        data: {
          ...sucursalData,
          departamento_id: zona.ciudad.departamento_id,
        },
      });

      if (materiales?.length) {
        this.validarMaterialesOtro(materiales);
        await tx.sucursal_material.createMany({
          data: materiales.map((m) => ({
            sucursal_id: sucursal.id,
            material_id: m.material_id ?? null,
            nombre_personalizado: m.nombre_personalizado?.trim() || null,
            unidad_medida: m.unidad_medida ?? null,
            cantidad_aproximada: m.cantidad_aproximada,
          })),
        });
      }

      if (horarios?.length) {
        await tx.sucursal_horario.createMany({
          data: mapHorarios(sucursal.id, horarios),
        });
      }

      return tx.sucursal.findUniqueOrThrow({
        where: { id: sucursal.id },
        include: sucursalInclude,
      });
    });
  }

  async findAll(
    query: SucursalQueryDto,
    userId?: number,
    userRol?: rol_usuario,
    departamentoActivo?: number | null,
  ) {
    // Derivar/validar zona o departamento según el rol para evitar IDOR.
    // ADMIN aplica filtro por departamento_activo. GENERADOR no aplica filtro
    // de depto (es entidad global y sus sucursales pueden estar en cualquier
    // depto). RECOLECTOR se restringe a su zona. ACOPIADOR a su depto.
    let zonaIdFiltro = query.zona_id;
    let departamentoIdFiltro: number | undefined;

    if (userRol === 'RECOLECTOR' && userId != null) {
      const recolector = await this.prisma.recolector.findFirst({
        where: { usuario_id: userId },
        select: { zona_id: true },
      });
      if (!recolector) throw new ForbiddenException('Recolector no encontrado');
      // Si manda zona_id distinta a la suya, se rechaza. Si no manda, se
      // deriva automáticamente.
      if (query.zona_id != null && query.zona_id !== recolector.zona_id) {
        throw new ForbiddenException('No puede consultar sucursales de otras zonas');
      }
      zonaIdFiltro = recolector.zona_id;
    } else if (userRol === 'ACOPIADOR' && userId != null) {
      // El centro operacional ve sucursales de SU DEPARTAMENTO (sin importar
      // la zona). Si manda zona_id, se valida que esa zona pertenezca al
      // mismo departamento.
      const centro = await this.prisma.centro_operacional.findFirst({
        where: { usuario_id: userId },
        select: { departamento_id: true },
      });
      if (!centro) {
        throw new ForbiddenException('Centro operacional no encontrado');
      }

      if (query.zona_id != null) {
        const zona = await this.prisma.zona.findUnique({
          where: { id: query.zona_id },
          select: { ciudad: { select: { departamento_id: true } } },
        });
        if (!zona || zona.ciudad.departamento_id !== centro.departamento_id) {
          throw new ForbiddenException(
            'No puede consultar sucursales de departamentos distintos al suyo',
          );
        }
      }
      departamentoIdFiltro = centro.departamento_id;
    } else if (userRol === 'ADMIN' && departamentoActivo != null) {
      // Filtro global por depto activo del admin.
      departamentoIdFiltro = departamentoActivo;
    }

    const where: Prisma.sucursalWhereInput = {
      activo: query.activo,
      generador_id: query.generador_id,
      zona_id: zonaIdFiltro,
      departamento_id: departamentoIdFiltro,
      frecuencia: query.frecuencia,
      ...(query.search
        ? { nombre: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.sucursal.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { nombre: query.sortOrder },
        include: sucursalInclude,
      }),
      this.prisma.sucursal.count({ where }),
    ]);

    return new PaginatedResponseDto(data, total, query.page, query.limit);
  }

  async findOne(
    id: number,
    departamentoActivo: number | null,
    userRol?: rol_usuario,
    userId?: number,
  ) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      include: sucursalInclude,
    });

    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

    // Filtro global por depto activo. Aplica al ADMIN. El GENERADOR puede
    // tener sucursales en cualquier depto (entidad global), así que no se
    // le aplica el filtro.
    if (
      userRol === 'ADMIN' &&
      departamentoActivo != null &&
      sucursal.departamento_id !== departamentoActivo
    ) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    // Object-level authorization (OWASP API1:2023 BOLA): un generador solo
    // puede consultar sucursales de su propia empresa, no de otros generadores.
    if (userRol === 'GENERADOR') {
      const generador = await this.prisma.generador.findUnique({
        where: { id: sucursal.generador_id },
        select: { usuario_id: true },
      });
      if (!generador || generador.usuario_id !== userId) {
        throw new NotFoundException('Sucursal no encontrada');
      }
    }

    return sucursal;
  }

  async update(
    id: number,
    dto: UpdateSucursalDto,
    departamentoActivo: number | null,
  ) {
    await this.findOne(id, departamentoActivo, 'ADMIN');

    const { materiales, horarios, ...sucursalData } = dto;

    // Si cambia la zona, recalcular departamento_id (siempre se deriva de la
    // zona, nunca lo manda el cliente) y validar que la nueva zona sea del
    // departamento activo — coherente con `create`.
    let departamentoIdNuevo: number | undefined;
    if (sucursalData.zona_id !== undefined) {
      const zona = await this.prisma.zona.findUnique({
        where: { id: sucursalData.zona_id },
        select: { ciudad: { select: { departamento_id: true } } },
      });
      if (!zona) throw new NotFoundException('Zona no encontrada');
      if (
        departamentoActivo != null &&
        zona.ciudad.departamento_id !== departamentoActivo
      ) {
        throw new BadRequestException(
          'No se puede mover la sucursal a una zona de otro departamento',
        );
      }
      departamentoIdNuevo = zona.ciudad.departamento_id;
    }

    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(sucursalData).length > 0) {
        await tx.sucursal.update({
          where: { id },
          data: {
            ...sucursalData,
            ...(departamentoIdNuevo !== undefined
              ? { departamento_id: departamentoIdNuevo }
              : {}),
          },
        });
      }

      if (materiales !== undefined) {
        await tx.sucursal_material.deleteMany({
          where: { sucursal_id: id },
        });
        if (materiales.length > 0) {
          this.validarMaterialesOtro(materiales);
          await tx.sucursal_material.createMany({
            data: materiales.map((m) => ({
              sucursal_id: id,
              material_id: m.material_id ?? null,
              nombre_personalizado: m.nombre_personalizado?.trim() || null,
              unidad_medida: m.unidad_medida ?? null,
              cantidad_aproximada: m.cantidad_aproximada,
            })),
          });
        }
      }

      if (horarios !== undefined) {
        await tx.sucursal_horario.deleteMany({
          where: { sucursal_id: id },
        });
        if (horarios.length > 0) {
          await tx.sucursal_horario.createMany({
            data: mapHorarios(id, horarios),
          });
        }
      }

      return tx.sucursal.findUniqueOrThrow({
        where: { id },
        include: sucursalInclude,
      });
    });
  }

  async hardDelete(id: number, departamentoActivo: number | null) {
    await this.findOne(id, departamentoActivo, 'ADMIN');
    await this.prisma.sucursal.delete({ where: { id } });
  }

  /**
   * Actualizar horarios de una sucursal.
   * El generador solo puede modificar horarios de sus propias sucursales.
   */
  async updateHorarios(id: number, horarios: SucursalHorarioDto[], userId: number) {
    const sucursal = await this.prisma.sucursal.findUnique({
      where: { id },
      include: { generador: { select: { usuario_id: true } } },
    });

    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

    if (sucursal.generador.usuario_id !== userId) {
      throw new ForbiddenException('Esta sucursal no pertenece a su empresa');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.sucursal_horario.deleteMany({ where: { sucursal_id: id } });

      if (horarios.length > 0) {
        await tx.sucursal_horario.createMany({
          data: mapHorarios(id, horarios),
        });
      }

      return tx.sucursal.findUniqueOrThrow({
        where: { id },
        include: sucursalInclude,
      });
    });
  }

  /**
   * Valida que cada material de la sucursal sea O del catálogo (`material_id`)
   * O un "Otro" de texto libre (`nombre_personalizado`), nunca ambos ni
   * ninguno. Coincide con el CHECK de BD `chk_sucmat_material_xor_otro`.
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
