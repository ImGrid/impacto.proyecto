import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { estado_transaccion, unidad_medida } from '@prisma/client';

export class DetalleTransaccionDto {
  @IsInt()
  @Type(() => Number)
  material_id: number;

  // Opcional a nivel DTO porque el GENERADOR puede registrar materiales
  // sin pesarlos (solo avisa que tiene determinado tipo de residuo). Los
  // demás roles (RECOLECTOR, ACOPIADOR, ADMIN) tienen una validación
  // adicional en el service que exige cantidad > 0.
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  cantidad?: number;

  @IsEnum(unidad_medida)
  unidad_medida: unidad_medida;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  precio_unitario?: number;

  // Sucursal de origen de esta línea (opcional). Permite registrar que
  // un mismo recolector consolidó material de varias sucursales en una
  // sola entrega: 2 kg papel de Banco Sur + 1 kg plástico de Banco Norte
  // serían 2 líneas con distinto `sucursal_id`. NULL = origen no identificado.
  // Validaciones del service:
  // - Si la transacción tiene recolector, la sucursal debe estar en el
  //   mismo departamento que el recolector.
  // - Si el creador es GENERADOR, la sucursal debe pertenecer a él (o
  //   se autocompleta con su única sucursal).
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sucursal_id?: number;
}

export class CreateTransaccionDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  recolector_id?: number;

  // -------- Destino polimórfico --------
  // Máximo 1 de los 3 puede venir marcado. La validación de unicidad
  // se hace en el service (la BD también lo enforce con CHECK constraint).
  //
  // - centro_operacional_id: entrega a un centro operacional del sistema.
  //   Único caso que permite alcanzar el estado PAGADO.
  // - acopiador_externo_id: vendió a un acopiador/comprador externo del
  //   catálogo. Queda en ENTREGADO indefinidamente.
  // - destino_desconocido: se sabe que se entregó pero no a quién.
  //   También se queda en ENTREGADO.
  // Los 3 vacíos = destino pendiente (admin importando registro parcial,
  // o recolector que aún no decidió).
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  centro_operacional_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  acopiador_externo_id?: number;

  @IsOptional()
  @IsBoolean()
  destino_desconocido?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  zona_id?: number;

  // Solo aplica cuando el creador es ADMIN. Para los demás roles el service
  // determina el estado automáticamente según el rol.
  // - 'RECOLECTADO': admin registra una recolección (sin destino).
  // - 'ENTREGADO': admin registra una entrega (destino libre, incluido vacío).
  @IsOptional()
  @IsEnum(estado_transaccion)
  estado?: estado_transaccion;

  // Backdating opcional para ADMIN (formato YYYY-MM-DD).
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La fecha debe ser una fecha válida (YYYY-MM-DD)' },
  )
  fecha?: string;

  // Hora opcional para ADMIN (formato HH:mm).
  @IsOptional()
  @IsString()
  hora?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;

  @IsArray()
  @IsNotEmpty({ message: 'Debe incluir al menos un material' })
  @ValidateNested({ each: true })
  @Type(() => DetalleTransaccionDto)
  detalles: DetalleTransaccionDto[];
}
