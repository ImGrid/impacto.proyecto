import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { toBoolean } from '../../common/helpers';
import { ReporteQueryDto } from './reporte-query.dto';
import { ReporteRecolectorasQueryDto } from './reporte-recolectoras-query.dto';
import { ReporteSucursalesQueryDto } from './reporte-sucursales-query.dto';

/**
 * Filtros de un export: los mismos del reporte (desde/hasta) + el formato.
 * `formato` debe estar whitelisteado o el ValidationPipe global (forbidNonWhitelisted)
 * rechaza la query con 400.
 *
 * `graficos` controla si el PDF incluye los gráficos (decisión del cliente:
 * quien descarga puede quererlos o no). Solo aplica al PDF (el Excel nunca lleva
 * gráficos). Ausente = se incluyen (default ON); `graficos=false` los omite.
 */
export class ReporteExportQueryDto extends ReporteQueryDto {
  @IsOptional()
  @IsIn(['excel', 'pdf'])
  formato?: 'excel' | 'pdf';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  graficos?: boolean;
}

/** Export de la lista de recolectoras: todos sus filtros + formato. */
export class ReporteRecolectorasExportQueryDto extends ReporteRecolectorasQueryDto {
  @IsOptional()
  @IsIn(['excel', 'pdf'])
  formato?: 'excel' | 'pdf';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  graficos?: boolean;
}

/**
 * Export del reporte nacional: período + formato + `metrica`, que indica qué
 * métrica grafica el PDF (kg/bs/co2_kg) para que el gráfico refleje lo que el
 * usuario tenía seleccionado en pantalla. Sin `metrica` → kg.
 */
export class ReporteNacionalExportQueryDto extends ReporteExportQueryDto {
  @IsOptional()
  @IsIn(['kg', 'bs', 'co2_kg'])
  metrica?: 'kg' | 'bs' | 'co2_kg';
}

/** Export de la lista de sucursales: todos sus filtros + formato + gráficos. */
export class ReporteSucursalesExportQueryDto extends ReporteSucursalesQueryDto {
  @IsOptional()
  @IsIn(['excel', 'pdf'])
  formato?: 'excel' | 'pdf';

  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  graficos?: boolean;
}
