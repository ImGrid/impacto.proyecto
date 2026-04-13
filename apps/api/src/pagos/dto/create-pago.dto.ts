import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';

export class CreatePagoDto {
  @IsInt()
  @Type(() => Number)
  recolector_id: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debe seleccionar al menos una transacción' })
  @IsInt({ each: true })
  @Type(() => Number)
  transaccion_ids: number[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observaciones?: string;
}
