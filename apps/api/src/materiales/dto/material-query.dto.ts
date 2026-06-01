import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto';

export class MaterialQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  // Permite a un GENERADOR (sin departamento activo en el JWT) pedir la
  // lista de materiales de un departamento concreto (el de su sucursal).
  // Los roles con departamento fijo (admin/recolector/centro op) lo ignoran:
  // el service prioriza el departamento_activo del JWT.
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  departamento_id?: number;
}
