import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { unidad_medida } from '@prisma/client';

export class DetalleTransaccionDto {
  @IsInt()
  @Type(() => Number)
  material_id: number;

  @IsNumber()
  @Type(() => Number)
  cantidad: number;

  @IsEnum(unidad_medida)
  unidad_medida: unidad_medida;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  precio_unitario?: number;
}

export class CreateTransaccionDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  recolector_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  sucursal_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  zona_id?: number;

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
