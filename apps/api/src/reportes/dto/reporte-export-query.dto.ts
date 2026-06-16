import { IsIn, IsOptional } from 'class-validator';
import { ReporteQueryDto } from './reporte-query.dto';
import { ReporteRecolectorasQueryDto } from './reporte-recolectoras-query.dto';

/**
 * Filtros de un export: los mismos del reporte (desde/hasta) + el formato.
 * `formato` debe estar whitelisteado o el ValidationPipe global (forbidNonWhitelisted)
 * rechaza la query con 400.
 */
export class ReporteExportQueryDto extends ReporteQueryDto {
  @IsOptional()
  @IsIn(['excel', 'pdf'])
  formato?: 'excel' | 'pdf';
}

/** Export de la lista de recolectoras: todos sus filtros + formato. */
export class ReporteRecolectorasExportQueryDto extends ReporteRecolectorasQueryDto {
  @IsOptional()
  @IsIn(['excel', 'pdf'])
  formato?: 'excel' | 'pdf';
}
