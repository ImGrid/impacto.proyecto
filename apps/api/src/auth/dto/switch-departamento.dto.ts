import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty } from 'class-validator';

export class SwitchDepartamentoDto {
  @IsInt()
  @IsNotEmpty()
  @Type(() => Number)
  departamento_id: number;
}
