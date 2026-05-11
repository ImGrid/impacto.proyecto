import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCiudadDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  departamento_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;
}
