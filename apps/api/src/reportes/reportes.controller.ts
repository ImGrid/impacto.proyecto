import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { rol_usuario } from '@prisma/client';
import { CurrentUser, Roles } from '../auth/decorators';
import { ReportesService } from './reportes.service';
import {
  ReporteQueryDto,
  ReporteExportQueryDto,
  ReporteRecolectorasQueryDto,
  ReporteRecolectorasExportQueryDto,
  ReporteNacionalExportQueryDto,
  ReporteSucursalesQueryDto,
  ReporteSucursalesExportQueryDto,
} from './dto';
import {
  construirExcelReporte,
  construirExcelMatriz,
  construirExcelRecolectora,
  construirExcelSucursal,
  type ExcelColumna,
} from './export/excel.util';
import {
  construirPdfReporte,
  construirPdfMatriz,
  construirPdfRecolectora,
  construirPdfSucursal,
  pdfNum,
  type PdfTipoCol,
  type PdfColumna,
} from './export/pdf.util';
import { svgBarras, svgDonaGenero } from './export/chart.util';
import { PdfService } from './export/pdf.service';
import { ImageStorageService } from '../common/services/image-storage.service';

// Etiquetas amigables del tipo de destino (el backend devuelve el código).
const TIPO_DESTINO_LABEL: Record<string, string> = {
  centro_op: 'Centro operacional',
  externo: 'Externo',
  desconocido: 'Desconocido',
  sin_asignar: 'Sin asignar',
};

// Formatos numéricos de Excel por tipo de columna (espejo de PdfTipoCol).
const NUMFMT: Record<PdfTipoCol, string | undefined> = {
  text: undefined,
  int: '#,##0',
  kg: '#,##0.00" kg"',
  co2: '#,##0.00" kg"',
  bs: '"Bs "#,##0.00',
  pct: '0.0"%"',
};

/**
 * Definición ÚNICA de columna por reporte: se deriva a columnas de Excel
 * (numFmt + align) y a columnas de PDF (tipo). Evita mantener dos listas.
 */
type Col = { header: string; key: string; width?: number; tipo: PdfTipoCol };
const aExcel = (cols: Col[]): ExcelColumna[] =>
  cols.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width,
    numFmt: NUMFMT[c.tipo],
    align: c.tipo !== 'text' ? ('right' as const) : ('left' as const),
  }));
const aPdf = (cols: Col[]): PdfColumna[] =>
  cols.map((c) => ({ header: c.header, key: c.key, tipo: c.tipo }));

@Controller('reportes')
@Roles(rol_usuario.ADMIN)
export class ReportesController {
  constructor(
    private readonly reportesService: ReportesService,
    private readonly pdf: PdfService,
    private readonly images: ImageStorageService,
  ) {}

  private enviarExcel(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  private enviarPdf(res: Response, buffer: Buffer, filename: string) {
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  @Get('por-asociacion')
  porAsociacion(
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.porAsociacion(query, depto);
  }

  // Reporte NACIONAL: comparación entre departamentos, SIN scope de depto.
  // No lee `departamento_activo` a propósito → siempre muestra todo el país,
  // disponible para cualquier admin (el @Roles(ADMIN) de la clase basta).
  @Get('nacional')
  nacional(@Query() query: ReporteQueryDto) {
    return this.reportesService.nacional(query);
  }

  // Fecha del dato más antiguo: el calendario de los filtros llega hasta ahí (no
  // a un año fijo). Abierto a cualquier admin, sin scope.
  @Get('rango-fechas')
  rangoFechas() {
    return this.reportesService.rangoFechas();
  }

  // Export del nacional (Excel/PDF). `metrica` define qué grafica el PDF.
  @Get('nacional/export')
  async exportNacional(
    @Query() query: ReporteNacionalExportQueryDto,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.nacional(query);
    const cols: Col[] = [
      { header: 'Departamento', key: 'departamento', width: 22, tipo: 'text' },
      { header: 'Entregas', key: 'transacciones', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: 'CO₂ evitado', key: 'co2_kg', width: 16, tipo: 'co2' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      transacciones: data.total.transacciones,
      kg: data.total.kg,
      co2_kg: data.total.co2_kg,
      bs: data.total.bs,
    };
    const conDatos = data.items.filter(
      (i) => i.kg > 0 || i.bs > 0 || i.co2_kg > 0,
    ).length;
    // Default del nacional = todo el histórico (sin rango elegido).
    const periodoLabel =
      !query.desde && !query.hasta ? 'Todo el histórico' : undefined;

    if (query.formato === 'pdf') {
      // El gráfico grafica la métrica que el usuario tenía seleccionada (kg def).
      const metrica = query.metrica ?? 'kg';
      const META: Record<
        'kg' | 'bs' | 'co2_kg',
        { titulo: string; formato: 'kg' | 'bs' }
      > = {
        kg: { titulo: 'Recolectado por departamento (kg)', formato: 'kg' },
        bs: { titulo: 'Generado por departamento (Bs)', formato: 'bs' },
        co2_kg: { titulo: 'CO₂ evitado por departamento (kg)', formato: 'kg' },
      };
      const m = META[metrica];
      const grafico =
        query.graficos === false
          ? undefined
          : (svgBarras({
              items: data.items.map((i) => ({
                label: i.departamento,
                value: i[metrica],
              })),
              formato: m.formato,
              titulo: m.titulo,
              minItems: 2,
            }) ?? undefined);
      const html = construirPdfReporte({
        titulo: 'Comparación nacional',
        periodo: data.rango,
        periodoLabel,
        kpis: [
          { label: 'Departamentos con datos', value: pdfNum.ent(conDatos) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas: data.items,
        total,
        grafico,
      });
      return this.enviarPdf(res, await this.pdf.render(html), 'reporte-nacional.pdf');
    }
    const buffer = await construirExcelReporte({
      titulo: 'Comparación nacional',
      periodo: data.rango,
      periodoLabel,
      columnas: aExcel(cols),
      filas: data.items,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-nacional.xlsx');
  }

  // ============================================================
  // Exportación a Excel (cada reporte con sus columnas / forma)
  // ============================================================

  @Get('por-asociacion/export')
  async exportPorAsociacion(
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.porAsociacion(query, depto);
    const cols: Col[] = [
      { header: 'Asociación', key: 'asociacion', width: 32, tipo: 'text' },
      { header: 'Recolectoras', key: 'recolectoras', width: 14, tipo: 'int' },
      { header: 'Entregas', key: 'transacciones', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: 'CO₂ evitado', key: 'co2_kg', width: 16, tipo: 'co2' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      recolectoras: data.total.recolectoras,
      transacciones: data.total.transacciones,
      kg: data.total.kg,
      co2_kg: data.total.co2_kg,
      bs: data.total.bs,
    };
    if (query.formato === 'pdf') {
      const html = construirPdfReporte({
        titulo: 'Recolección por asociación',
        periodo: data.rango,
        kpis: [
          { label: 'Asociaciones', value: pdfNum.ent(data.items.length) },
          { label: 'Recolectoras', value: pdfNum.ent(data.total.recolectoras) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas: data.items,
        total,
        grafico:
          query.graficos === false
            ? undefined
            : (svgBarras({
                items: data.items.map((i) => ({
                  label: i.asociacion,
                  value: i.kg,
                })),
                formato: 'kg',
                titulo: 'Recolectado por asociación (kg)',
              }) ?? undefined),
      });
      return this.enviarPdf(res, await this.pdf.render(html), 'reporte-por-asociacion.pdf');
    }
    const buffer = await construirExcelReporte({
      titulo: 'Recolección por asociación',
      periodo: data.rango,
      columnas: aExcel(cols),
      filas: data.items,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-por-asociacion.xlsx');
  }

  @Get('por-zona/export')
  async exportPorZona(
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.porZona(query, depto);
    const cols: Col[] = [
      { header: 'Zona', key: 'zona', width: 24, tipo: 'text' },
      { header: 'Ciudad', key: 'ciudad', width: 18, tipo: 'text' },
      { header: 'Recolectoras', key: 'recolectoras', width: 14, tipo: 'int' },
      { header: 'Entregas', key: 'transacciones', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: 'CO₂ evitado', key: 'co2_kg', width: 16, tipo: 'co2' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      recolectoras: data.total.recolectoras,
      transacciones: data.total.transacciones,
      kg: data.total.kg,
      co2_kg: data.total.co2_kg,
      bs: data.total.bs,
    };
    if (query.formato === 'pdf') {
      const html = construirPdfReporte({
        titulo: 'Recolección por zona',
        periodo: data.rango,
        kpis: [
          { label: 'Zonas', value: pdfNum.ent(data.items.length) },
          { label: 'Recolectoras', value: pdfNum.ent(data.total.recolectoras) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas: data.items,
        total,
        grafico:
          query.graficos === false
            ? undefined
            : (svgBarras({
                items: data.items.map((i) => ({ label: i.zona, value: i.kg })),
                formato: 'kg',
                titulo: 'Recolectado por zona (kg)',
              }) ?? undefined),
      });
      return this.enviarPdf(res, await this.pdf.render(html), 'reporte-por-zona.pdf');
    }
    const buffer = await construirExcelReporte({
      titulo: 'Recolección por zona',
      periodo: data.rango,
      columnas: aExcel(cols),
      filas: data.items,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-por-zona.xlsx');
  }

  @Get('por-destino/export')
  async exportPorDestino(
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.porDestino(query, depto);
    const filas = data.items.map((d) => ({
      destino: d.destino,
      tipo: TIPO_DESTINO_LABEL[d.tipo_destino] ?? d.tipo_destino,
      transacciones: d.transacciones,
      kg: d.kg,
      co2_kg: d.co2_kg,
      bs: d.bs,
    }));
    const cols: Col[] = [
      { header: 'Destino', key: 'destino', width: 36, tipo: 'text' },
      { header: 'Tipo', key: 'tipo', width: 20, tipo: 'text' },
      { header: 'Entregas', key: 'transacciones', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: 'CO₂ evitado', key: 'co2_kg', width: 16, tipo: 'co2' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      transacciones: data.total.transacciones,
      kg: data.total.kg,
      co2_kg: data.total.co2_kg,
      bs: data.total.bs,
    };
    if (query.formato === 'pdf') {
      const html = construirPdfReporte({
        titulo: 'Recolección por destino',
        periodo: data.rango,
        kpis: [
          { label: 'Destinos', value: pdfNum.ent(data.items.length) },
          { label: 'Entregas', value: pdfNum.ent(data.total.transacciones) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas,
        total,
      });
      return this.enviarPdf(res, await this.pdf.render(html), 'reporte-por-destino.pdf');
    }
    const buffer = await construirExcelReporte({
      titulo: 'Recolección por destino',
      periodo: data.rango,
      columnas: aExcel(cols),
      filas,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-por-destino.xlsx');
  }

  @Get('por-material/export')
  async exportPorMaterial(
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.porMaterial(query, depto);
    const cols: Col[] = [
      { header: 'Material', key: 'material', width: 28, tipo: 'text' },
      { header: 'Entregas', key: 'transacciones', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: '% del total', key: 'porcentaje', width: 12, tipo: 'pct' },
      { header: 'CO₂ evitado', key: 'co2_kg', width: 16, tipo: 'co2' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      transacciones: data.total.transacciones,
      kg: data.total.kg,
      co2_kg: data.total.co2_kg,
      bs: data.total.bs,
    };
    if (query.formato === 'pdf') {
      const html = construirPdfReporte({
        titulo: 'Recolección por material',
        periodo: data.rango,
        kpis: [
          { label: 'Materiales', value: pdfNum.ent(data.items.length) },
          { label: 'Entregas', value: pdfNum.ent(data.total.transacciones) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas: data.items,
        total,
        grafico:
          query.graficos === false
            ? undefined
            : (svgBarras({
                items: data.items.map((i) => ({
                  label: i.material,
                  value: i.kg,
                })),
                formato: 'kg',
                titulo: 'Recolectado por material (kg)',
              }) ?? undefined),
      });
      return this.enviarPdf(res, await this.pdf.render(html), 'reporte-por-material.pdf');
    }
    const buffer = await construirExcelReporte({
      titulo: 'Recolección por material',
      periodo: data.rango,
      columnas: aExcel(cols),
      filas: data.items,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-por-material.xlsx');
  }

  @Get('por-generador/export')
  async exportPorGenerador(
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.porGenerador(query, depto);
    const filas = data.items.map((g) => ({
      ...g,
      tipo_generador: g.tipo_generador ?? '—',
    }));
    const cols: Col[] = [
      { header: 'Generador', key: 'generador', width: 28, tipo: 'text' },
      { header: 'Tipo', key: 'tipo_generador', width: 16, tipo: 'text' },
      { header: 'Sucursales', key: 'sucursales', width: 12, tipo: 'int' },
      { header: 'Entregas', key: 'transacciones', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: 'CO₂ evitado', key: 'co2_kg', width: 16, tipo: 'co2' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      sucursales: data.total.sucursales,
      transacciones: data.total.transacciones,
      kg: data.total.kg,
      co2_kg: data.total.co2_kg,
      bs: data.total.bs,
    };
    if (query.formato === 'pdf') {
      const html = construirPdfReporte({
        titulo: 'Cantidad por generador',
        periodo: data.rango,
        kpis: [
          { label: 'Generadores', value: pdfNum.ent(data.items.length) },
          { label: 'Sucursales', value: pdfNum.ent(data.total.sucursales) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas,
        total,
        grafico:
          query.graficos === false
            ? undefined
            : (svgBarras({
                items: data.items.map((i) => ({
                  label: i.generador,
                  value: i.kg,
                })),
                formato: 'kg',
                titulo: 'Recolectado por generador (kg)',
              }) ?? undefined),
      });
      return this.enviarPdf(res, await this.pdf.render(html), 'reporte-por-generador.pdf');
    }
    const buffer = await construirExcelReporte({
      titulo: 'Cantidad por generador',
      periodo: data.rango,
      columnas: aExcel(cols),
      filas,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-por-generador.xlsx');
  }

  @Get('por-tipo-generador/export')
  async exportPorTipoGenerador(
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.porTipoGenerador(query, depto);
    const cols: Col[] = [
      { header: 'Tipo de generador', key: 'tipo_generador', width: 22, tipo: 'text' },
      { header: 'Generadores', key: 'generadores', width: 13, tipo: 'int' },
      { header: 'Entregas', key: 'transacciones', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: 'CO₂ evitado', key: 'co2_kg', width: 16, tipo: 'co2' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      transacciones: data.total.transacciones,
      kg: data.total.kg,
      co2_kg: data.total.co2_kg,
      bs: data.total.bs,
    };
    if (query.formato === 'pdf') {
      const html = construirPdfReporte({
        titulo: 'Recolección por tipo de generador',
        periodo: data.rango,
        kpis: [
          { label: 'Tipos', value: pdfNum.ent(data.items.length) },
          { label: 'Entregas', value: pdfNum.ent(data.total.transacciones) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas: data.items,
        total,
        grafico:
          query.graficos === false
            ? undefined
            : (svgBarras({
                items: data.items.map((i) => ({
                  label: i.tipo_generador,
                  value: i.kg,
                })),
                formato: 'kg',
                titulo: 'Recolectado por tipo de generador (kg)',
              }) ?? undefined),
      });
      return this.enviarPdf(res, await this.pdf.render(html), 'reporte-por-tipo-generador.pdf');
    }
    const buffer = await construirExcelReporte({
      titulo: 'Recolección por tipo de generador',
      periodo: data.rango,
      columnas: aExcel(cols),
      filas: data.items,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-por-tipo-generador.xlsx');
  }

  @Get('por-material-tipo-generador/export')
  async exportMatriz(
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.porMaterialTipoGenerador(query, depto);
    const items = data.items.map((i) => ({
      material: i.material,
      tipo_generador: i.tipo_generador,
      kg: i.kg,
    }));
    if (query.formato === 'pdf') {
      const html = construirPdfMatriz({
        periodo: data.rango,
        items,
        totalKg: data.total.kg,
      });
      // Horizontal: la matriz suele tener muchas columnas (tipos de generador).
      return this.enviarPdf(
        res,
        await this.pdf.render(html, { landscape: true }),
        'reporte-material-x-tipo-generador.pdf',
      );
    }
    const buffer = await construirExcelMatriz({
      periodo: data.rango,
      items,
      totalKg: data.total.kg,
    });
    this.enviarExcel(res, buffer, 'reporte-material-x-tipo-generador.xlsx');
  }

  // Lista de recolectoras filtrada (estática antes de `recolectoras/:id`).
  @Get('recolectoras/export')
  async exportRecolectoras(
    @Query() query: ReporteRecolectorasExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.recolectoras(query, depto);
    const filas = data.items.map((r) => ({
      nombre: r.nombre,
      ci: r.ci,
      edad: r.edad,
      genero: r.genero === 'MUJER' ? 'Mujer' : 'Hombre',
      zona: r.zona,
      asociacion: r.asociacion ?? '—',
      entregas: r.entregas,
      kg: r.kg,
      bs: r.bs,
    }));
    const cols: Col[] = [
      { header: 'Recolectora', key: 'nombre', width: 26, tipo: 'text' },
      { header: 'CI', key: 'ci', width: 14, tipo: 'text' },
      { header: 'Edad', key: 'edad', width: 8, tipo: 'int' },
      { header: 'Género', key: 'genero', width: 10, tipo: 'text' },
      { header: 'Zona', key: 'zona', width: 18, tipo: 'text' },
      { header: 'Asociación', key: 'asociacion', width: 26, tipo: 'text' },
      { header: 'Entregas', key: 'entregas', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      entregas: data.total.entregas,
      kg: data.total.kg,
      bs: data.total.bs,
    };
    if (query.formato === 'pdf') {
      // Dos gráficos, un mensaje cada uno (principio "un gráfico, un mensaje"):
      // distribución por género (dona, 2 categorías) + top-10 por recolectado
      // (barras). `data.items` ya viene ordenado por kg desc, así que el slice
      // top-10 lo hace svgBarras. Las inactivas (kg 0) quedan fuera de las
      // barras (filtra value>0) pero sí cuentan en el género del grupo filtrado.
      const mujeres = data.items.filter((r) => r.genero === 'MUJER').length;
      const hombres = data.items.filter((r) => r.genero === 'HOMBRE').length;
      // Dos gráficos LADO A LADO (la dona a su ancho natural, las barras toman
      // el resto): en landscape ocupan poca altura, así no dejan hueco ni
      // empujan la tabla a otra hoja.
      const dona =
        svgDonaGenero({
          mujeres,
          hombres,
          titulo: 'Distribución por género',
          clase: 'g-dona',
        }) ?? '';
      const barras =
        svgBarras({
          items: data.items.map((r) => ({ label: r.nombre, value: r.kg })),
          formato: 'kg',
          titulo: 'Top recolectoras por recolectado (kg)',
          maxItems: 10,
          clase: 'g-barras',
        }) ?? '';
      const grafico =
        query.graficos === false || !(dona || barras)
          ? undefined
          : `<div class="grafico-par">${dona}${barras}</div>`;
      const html = construirPdfReporte({
        titulo: 'Recolectoras',
        periodo: data.rango,
        kpis: [
          { label: 'Recolectoras', value: pdfNum.ent(data.total.recolectoras) },
          { label: 'Con entregas', value: pdfNum.ent(data.total.activas) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas,
        total,
        grafico: grafico || undefined,
      });
      // Horizontal: muchas columnas (datos + actividad) caben mejor apaisado.
      return this.enviarPdf(
        res,
        await this.pdf.render(html, { landscape: true }),
        'reporte-recolectoras.pdf',
      );
    }
    const buffer = await construirExcelReporte({
      titulo: 'Recolectoras',
      periodo: data.rango,
      columnas: aExcel(cols),
      filas,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-recolectoras.xlsx');
  }

  // Ficha de UNA recolectora (perfil declarado + actividad real).
  @Get('recolectoras/:id/export')
  async exportRecolectora(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const d = await this.reportesService.recolectoraDetalle(id, query, depto);
    if (query.formato === 'pdf') {
      // Leer la foto del disco y embeberla (null si no tiene → no se muestra).
      const fotoDataUri = await this.images.readAsDataUri(d.perfil.foto_url);
      const html = construirPdfRecolectora({
        periodo: d.rango,
        fotoDataUri,
        perfil: d.perfil,
        actividad: d.actividad,
      });
      return this.enviarPdf(
        res,
        await this.pdf.render(html),
        `ficha-recolectora-${id}.pdf`,
      );
    }
    const buffer = await construirExcelRecolectora({
      periodo: d.rango,
      perfil: d.perfil,
      actividad: d.actividad,
    });
    this.enviarExcel(res, buffer, `ficha-recolectora-${id}.xlsx`);
  }

  @Get('por-zona')
  porZona(
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.porZona(query, depto);
  }

  @Get('por-destino')
  porDestino(
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.porDestino(query, depto);
  }

  @Get('por-generador')
  porGenerador(
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.porGenerador(query, depto);
  }

  @Get('por-material')
  porMaterial(
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.porMaterial(query, depto);
  }

  @Get('por-tipo-generador')
  porTipoGenerador(
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.porTipoGenerador(query, depto);
  }

  @Get('por-material-tipo-generador')
  porMaterialTipoGenerador(
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.porMaterialTipoGenerador(query, depto);
  }

  // --- Reporte dinámico de recolectoras (lista + detalle) ---

  @Get('recolectoras')
  recolectoras(
    @Query() query: ReporteRecolectorasQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.recolectoras(query, depto);
  }

  @Get('recolectoras/:id')
  recolectoraDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.recolectoraDetalle(id, query, depto);
  }

  // --- Reporte por sucursal (lista + ficha) ---

  @Get('sucursales')
  sucursales(
    @Query() query: ReporteSucursalesQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.sucursales(query, depto);
  }

  // Export de la LISTA de sucursales (estático antes de `sucursales/:id`).
  @Get('sucursales/export')
  async exportSucursales(
    @Query() query: ReporteSucursalesExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.sucursales(query, depto);
    const cols: Col[] = [
      { header: 'Sucursal', key: 'sucursal', width: 28, tipo: 'text' },
      { header: 'Generador', key: 'generador', width: 24, tipo: 'text' },
      { header: 'Tipo', key: 'tipo_generador', width: 16, tipo: 'text' },
      { header: 'Ciudad', key: 'ciudad', width: 16, tipo: 'text' },
      { header: 'Entregas', key: 'entregas', width: 12, tipo: 'int' },
      { header: 'Recolectado', key: 'kg', width: 16, tipo: 'kg' },
      { header: 'CO₂ evitado', key: 'co2_kg', width: 16, tipo: 'co2' },
      { header: 'Generado', key: 'bs', width: 16, tipo: 'bs' },
    ];
    const total = {
      entregas: data.total.transacciones,
      kg: data.total.kg,
      co2_kg: data.total.co2_kg,
      bs: data.total.bs,
    };
    if (query.formato === 'pdf') {
      const html = construirPdfReporte({
        titulo: 'Recolección por sucursal',
        periodo: data.rango,
        kpis: [
          { label: 'Sucursales', value: pdfNum.ent(data.total.sucursales) },
          { label: 'Entregas', value: pdfNum.ent(data.total.transacciones) },
          { label: 'Recolectado', value: pdfNum.kg(data.total.kg) },
          { label: 'CO₂ evitado', value: pdfNum.kg(data.total.co2_kg) },
          { label: 'Generado', value: pdfNum.bs(data.total.bs) },
        ],
        columnas: aPdf(cols),
        filas: data.items,
        total,
        grafico:
          query.graficos === false
            ? undefined
            : (svgBarras({
                items: data.items.map((i) => ({
                  label: i.sucursal,
                  value: i.kg,
                })),
                formato: 'kg',
                titulo: 'Recolectado por sucursal (kg)',
              }) ?? undefined),
      });
      // Horizontal: muchas columnas (sucursal + generador + tipo + ciudad + …).
      return this.enviarPdf(
        res,
        await this.pdf.render(html, { landscape: true }),
        'reporte-por-sucursal.pdf',
      );
    }
    const buffer = await construirExcelReporte({
      titulo: 'Recolección por sucursal',
      periodo: data.rango,
      columnas: aExcel(cols),
      filas: data.items,
      total,
    });
    this.enviarExcel(res, buffer, 'reporte-por-sucursal.xlsx');
  }

  // Ficha de UNA sucursal (datos + actividad real + desglose por material).
  @Get('sucursales/:id/export')
  async exportSucursal(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ReporteExportQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
    @Res() res: Response,
  ) {
    const d = await this.reportesService.sucursalDetalle(id, query, depto);
    if (query.formato === 'pdf') {
      const html = construirPdfSucursal({
        periodo: d.rango,
        perfil: d.perfil,
        actividad: d.actividad,
      });
      return this.enviarPdf(res, await this.pdf.render(html), `ficha-sucursal-${id}.pdf`);
    }
    const buffer = await construirExcelSucursal({
      periodo: d.rango,
      perfil: d.perfil,
      actividad: d.actividad,
    });
    this.enviarExcel(res, buffer, `ficha-sucursal-${id}.xlsx`);
  }

  @Get('sucursales/:id')
  sucursalDetalle(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: ReporteQueryDto,
    @CurrentUser('departamento_activo') depto: number | null,
  ) {
    return this.reportesService.sucursalDetalle(id, query, depto);
  }
}
