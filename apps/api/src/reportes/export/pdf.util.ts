import { LOGO_TRIPLE_IMPACTO } from './logo.asset';

/**
 * Plantillas HTML para los PDF de reportes (Triple Impacto · docs/26 + docs/29).
 *
 * - HTML autocontenido: todo el CSS va inline en <style> y el logo embebido en
 *   base64 (no depende del filesystem ni del cwd en el VPS).
 * - Colores de marca (docs/14) con `print-color-adjust: exact` para que Chrome
 *   no los apague al imprimir (junto a `printBackground: true` en pdf.service).
 * - Números formateados en es-BO en el SERVIDOR (coma decimal, punto de miles):
 *   no se depende del locale del navegador.
 * - Todo dato interpolado se escapa (anti-inyección HTML).
 */

// Paleta de marca.
const TEAL = '#0C5C63';
const AZUL = '#007ECC';
const ZEBRA = '#EFF3F3';
const GRIS = '#666666';

// ---- formato ----
const nfBO = (n: number, d = 2) =>
  new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);

const kg = (n: number) => `${nfBO(n)} kg`;
const bs = (n: number) => `Bs ${nfBO(n)}`;
const ent = (n: number) => nfBO(n, 0);
const pct = (n: number) => `${nfBO(n, 1)}%`;

/** Formateadores es-BO reutilizables (para armar KPIs en el controller). */
export const pdfNum = { kg, bs, ent, co2: kg, pct };

function escapeHtml(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "2026-06-01..." → "01/06/2026" (sin desfase de zona horaria). */
function fechaBO(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}/${m}/${y}` : iso.slice(0, 10);
}

function hoyBO(): string {
  return new Intl.DateTimeFormat('es-BO', {
    timeZone: 'America/La_Paz',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());
}

// ---- columnas de tabla ----
export type PdfTipoCol = 'text' | 'int' | 'kg' | 'co2' | 'bs' | 'pct';
export type PdfColumna = { header: string; key: string; tipo?: PdfTipoCol };

function formatearCelda(tipo: PdfTipoCol | undefined, v: unknown): string {
  if (v == null || v === '') return tipo && tipo !== 'text' ? '—' : '';
  switch (tipo) {
    case 'int':
      return ent(Number(v));
    case 'kg':
    case 'co2':
      return kg(Number(v));
    case 'bs':
      return bs(Number(v));
    case 'pct':
      return pct(Number(v));
    default:
      return escapeHtml(v);
  }
}
const esNumerica = (t?: PdfTipoCol) => t != null && t !== 'text';

// ---- bloques reutilizables ----

/** CSS común de todos los reportes. */
const ESTILOS = `
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    color: #1a1a1a; font-size: 11px; line-height: 1.45;
  }
  .hoja { padding: 4px 2px; }
  /* cabecera del documento */
  .cab { display: flex; align-items: center; justify-content: space-between;
         border-bottom: 3px solid ${TEAL}; padding-bottom: 10px; margin-bottom: 16px; }
  .cab img { height: 46px; }
  .cab .meta { text-align: right; font-size: 9px; color: ${GRIS}; }
  .titulo { font-size: 20px; font-weight: 700; color: ${TEAL}; margin: 0 0 2px; }
  .subt { font-size: 10px; color: ${GRIS}; margin: 0 0 16px; page-break-after: avoid; }
  /* tarjetas KPI */
  .kpis { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; page-break-inside: avoid; }
  .kpi { flex: 1 1 0; min-width: 110px; border: 1px solid #e2e8e9;
         border-top: 3px solid ${AZUL}; border-radius: 6px; padding: 9px 11px; background: #fff; }
  .kpi .lbl { font-size: 8.5px; text-transform: uppercase; letter-spacing: .3px; color: ${GRIS}; }
  .kpi .val { font-size: 16px; font-weight: 700; color: ${TEAL}; margin-top: 2px; }
  /* tablas */
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  thead { display: table-header-group; }
  th { background: ${TEAL}; color: #fff; font-weight: 600; text-align: left;
       padding: 7px 9px; }
  th.num, td.num { text-align: right; white-space: nowrap; }
  td { padding: 6px 9px; border-bottom: 1px solid #eef1f1; }
  tr { page-break-inside: avoid; }
  tbody tr:nth-child(even) { background: ${ZEBRA}; }
  tr.total td { font-weight: 700; border-top: 2px solid ${TEAL}; background: #fff; }
  .vacio { color: ${GRIS}; text-align: center; padding: 28px 0; }
  /* ficha de recolectora */
  .seccion { page-break-inside: avoid; margin-bottom: 14px; }
  .seccion h2 { font-size: 12px; color: ${TEAL}; border-bottom: 1px solid #e2e8e9;
                padding-bottom: 4px; margin: 0 0 8px; }
  .seccion h2 small { color: ${GRIS}; font-weight: 400; }
  .datos { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 18px; }
  .datos .fila { display: flex; justify-content: space-between; border-bottom: 1px dotted #e2e8e9; padding: 3px 0; }
  .datos .fila .k { color: ${GRIS}; }
  .datos .fila .v { font-weight: 600; }
  .badges span { display: inline-block; background: ${ZEBRA}; border-radius: 10px;
                 padding: 2px 9px; margin: 2px 3px 2px 0; font-size: 9px; }
  .datos-wrap { display: flex; gap: 16px; align-items: flex-start; }
  .datos-wrap .datos { flex: 1; }
  .foto { width: 92px; height: auto; border: 1px solid #d9e0e1; border-radius: 6px;
          object-fit: cover; flex: 0 0 auto; }
  /* gráficos (SVG inline generado en el servidor) */
  .grafico { margin: 4px 0 16px; page-break-inside: avoid; }
  .grafico .cap { font-size: 10px; color: ${GRIS}; font-weight: 600; margin: 0 0 6px; }
  .grafico svg { display: block; }
  .grafico-flex { display: flex; gap: 20px; align-items: center; page-break-inside: avoid; }
  /* dos gráficos lado a lado (recolectoras en landscape): la dona ocupa su
     ancho natural y las barras toman el resto → bloque compacto en altura,
     no deja hueco ni empuja la tabla a otra página */
  .grafico-par { display: flex; gap: 28px; align-items: flex-start; page-break-inside: avoid; margin: 4px 0 16px; }
  .grafico-par > .grafico { margin: 0; }
  .grafico-par > .g-dona { flex: 0 0 auto; }
  .grafico-par > .g-barras { flex: 1 1 0; min-width: 0; }
  .dona-leyenda { font-size: 10.5px; color: #1a1a1a; }
  .dona-leyenda .it { display: flex; align-items: center; gap: 6px; margin: 5px 0; }
  .dona-leyenda .sw { width: 11px; height: 11px; border-radius: 2px; display: inline-block; flex: 0 0 auto; }
`;

/** Cabecera del documento: logo + título + período + emisión. */
function cabeceraHtml(
  titulo: string,
  periodo: { desde: string; hasta: string },
  extra?: string,
  periodoLabel?: string,
): string {
  const periodoTxt =
    periodoLabel ?? `${fechaBO(periodo.desde)} – ${fechaBO(periodo.hasta)}`;
  return `
  <div class="cab">
    <img src="${LOGO_TRIPLE_IMPACTO}" alt="Triple Impacto" />
    <div class="meta">
      <div>Reporte generado</div>
      <div>${hoyBO()}</div>
    </div>
  </div>
  <h1 class="titulo">${escapeHtml(titulo)}</h1>
  <p class="subt">Período: ${escapeHtml(periodoTxt)}${
    extra ? ` · ${escapeHtml(extra)}` : ''
  }</p>`;
}

function kpisHtml(kpis: { label: string; value: string }[]): string {
  if (!kpis.length) return '';
  return `<div class="kpis">${kpis
    .map(
      (k) =>
        `<div class="kpi"><div class="lbl">${escapeHtml(
          k.label,
        )}</div><div class="val">${escapeHtml(k.value)}</div></div>`,
    )
    .join('')}</div>`;
}

function tablaHtml(
  columnas: PdfColumna[],
  filas: Record<string, unknown>[],
  total?: Record<string, unknown>,
  totalLabel = 'TOTAL',
): string {
  const ths = columnas
    .map(
      (c) =>
        `<th class="${esNumerica(c.tipo) ? 'num' : ''}">${escapeHtml(
          c.header,
        )}</th>`,
    )
    .join('');

  if (filas.length === 0) {
    return `<table><thead><tr>${ths}</tr></thead><tbody><tr><td colspan="${columnas.length}" class="vacio">Sin datos en el período.</td></tr></tbody></table>`;
  }

  const cuerpo = filas
    .map((fila) => {
      const tds = columnas
        .map(
          (c) =>
            `<td class="${esNumerica(c.tipo) ? 'num' : ''}">${formatearCelda(
              c.tipo,
              fila[c.key],
            )}</td>`,
        )
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  let totalRow = '';
  if (total) {
    const tds = columnas
      .map((c, i) => {
        if (i === 0)
          return `<td>${escapeHtml(totalLabel)}</td>`;
        const v = total[c.key];
        return `<td class="${esNumerica(c.tipo) ? 'num' : ''}">${
          v == null ? '' : formatearCelda(c.tipo, v)
        }</td>`;
      })
      .join('');
    totalRow = `<tr class="total">${tds}</tr>`;
  }

  return `<table><thead><tr>${ths}</tr></thead><tbody>${cuerpo}${totalRow}</tbody></table>`;
}

/** Envuelve el contenido en un documento HTML completo. */
function documento(contenido: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><style>${ESTILOS}</style></head><body><div class="hoja">${contenido}</div></body></html>`;
}

// ============================================================
//  Builders públicos (uno por forma de reporte)
// ============================================================

/** Reporte tabular genérico (asociación, zona, destino, material, etc.). */
export function construirPdfReporte(opts: {
  titulo: string;
  periodo: { desde: string; hasta: string };
  kpis: { label: string; value: string }[];
  columnas: PdfColumna[];
  filas: Record<string, unknown>[];
  total?: Record<string, unknown>;
  /**
   * Gráfico(s) como HTML/SVG ya construido (ver chart.util). Se inyecta entre
   * los KPIs y la tabla. Opcional: si el reporte no aplica gráfico (o el filtro
   * lo dejó degenerado), no se pasa y el reporte sale solo con la tabla.
   */
  grafico?: string;
  /** Texto del período si no es un rango de fechas (p. ej. "Todo el histórico"). */
  periodoLabel?: string;
}): string {
  return documento(
    cabeceraHtml(opts.titulo, opts.periodo, undefined, opts.periodoLabel) +
      kpisHtml(opts.kpis) +
      (opts.grafico ?? '') +
      tablaHtml(opts.columnas, opts.filas, opts.total),
  );
}

/** Matriz material × tipo de generador (pivote, horizontal). */
export function construirPdfMatriz(opts: {
  periodo: { desde: string; hasta: string };
  items: { material: string; tipo_generador: string; kg: number }[];
  totalKg: number;
}): string {
  const sumPor = (campo: 'material' | 'tipo_generador') => {
    const m = new Map<string, number>();
    for (const it of opts.items) m.set(it[campo], (m.get(it[campo]) ?? 0) + it.kg);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  const materiales = sumPor('material');
  const tipos = sumPor('tipo_generador');
  const celda = new Map<string, number>();
  for (const it of opts.items) celda.set(`${it.material}|${it.tipo_generador}`, it.kg);
  const val = (m: string, t: string) => celda.get(`${m}|${t}`) ?? 0;

  const ths =
    `<th>Material</th>` +
    tipos.map((t) => `<th class="num">${escapeHtml(t)}</th>`).join('') +
    `<th class="num">Total</th>`;

  let cuerpo: string;
  if (materiales.length === 0) {
    cuerpo = `<tr><td colspan="${tipos.length + 2}" class="vacio">Sin material con origen identificado en el período.</td></tr>`;
  } else {
    cuerpo =
      materiales
        .map((m) => {
          const celdas = tipos
            .map((t) => {
              const v = val(m, t);
              return `<td class="num">${v > 0 ? kg(v) : '—'}</td>`;
            })
            .join('');
          const totFila = tipos.reduce((s, t) => s + val(m, t), 0);
          return `<tr><td>${escapeHtml(m)}</td>${celdas}<td class="num"><strong>${kg(totFila)}</strong></td></tr>`;
        })
        .join('') +
      `<tr class="total"><td>TOTAL</td>${tipos
        .map((t) => `<td class="num">${kg(materiales.reduce((s, m) => s + val(m, t), 0))}</td>`)
        .join('')}<td class="num">${kg(opts.totalKg)}</td></tr>`;
  }

  return documento(
    cabeceraHtml('Material × tipo de generador', opts.periodo, 'kilos (kg)') +
      `<table><thead><tr>${ths}</tr></thead><tbody>${cuerpo}</tbody></table>`,
  );
}

/** Ficha de UNA sucursal (datos + actividad real con desglose por material). */
export function construirPdfSucursal(opts: {
  periodo: { desde: string; hasta: string };
  perfil: {
    nombre: string;
    direccion: string;
    horario: string | null;
    generador: string;
    tipo_generador: string;
    zona: string | null;
    ciudad: string | null;
    departamento: string | null;
  };
  actividad: {
    total: { transacciones: number; kg: number; co2_kg: number; bs: number };
    por_material: { material: string; kg: number; bs: number }[];
    entregas: {
      fecha: Date | string;
      recolector: string | null;
      kg: number;
      bs: number;
    }[];
  };
}): string {
  const { perfil, actividad } = opts;
  const fechaCorta = (f: Date | string) =>
    new Intl.DateTimeFormat('es-BO', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(f));

  const fila = (k: string, v: string) =>
    `<div class="fila"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`;

  const gridDatos = `<div class="datos">${[
    fila('Generador', perfil.generador),
    fila('Tipo', perfil.tipo_generador),
    fila('Dirección', perfil.direccion),
    fila('Zona', perfil.zona ?? '—'),
    fila('Ciudad', perfil.ciudad ?? '—'),
    fila('Departamento', perfil.departamento ?? '—'),
    ...(perfil.horario ? [fila('Horario', perfil.horario)] : []),
  ].join('')}</div>`;
  const datos = `<div class="seccion"><h2>Datos</h2>${gridDatos}</div>`;

  const kpis = kpisHtml([
    { label: 'Entregas', value: ent(actividad.total.transacciones) },
    { label: 'Recolectado', value: kg(actividad.total.kg) },
    { label: 'CO₂ evitado', value: kg(actividad.total.co2_kg) },
    { label: 'Generado', value: bs(actividad.total.bs) },
  ]);

  const porMaterial = actividad.por_material.length
    ? `<p class="subt" style="margin:0 0 4px">Qué recolectó exactamente</p>` +
      tablaHtml(
        [
          { key: 'material', header: 'Material' },
          { key: 'kg', header: 'Recolectado', tipo: 'kg' },
          { key: 'bs', header: 'Generado', tipo: 'bs' },
        ],
        actividad.por_material.map((m) => ({
          material: m.material,
          kg: m.kg,
          bs: m.bs,
        })),
      )
    : '';

  const entregas = actividad.entregas.length
    ? `<p class="subt" style="margin:10px 0 4px">Entregas en el período</p>` +
      tablaHtml(
        [
          { key: 'fecha', header: 'Fecha' },
          { key: 'recolector', header: 'Recolector' },
          { key: 'kg', header: 'Recolectado', tipo: 'kg' },
          { key: 'bs', header: 'Generado', tipo: 'bs' },
        ],
        actividad.entregas.map((e) => ({
          fecha: fechaCorta(e.fecha),
          recolector: e.recolector ?? '—',
          kg: e.kg,
          bs: e.bs,
        })),
      )
    : '';

  // Encabezado + KPIs en `.seccion` (no se parten); tablas fuera para que fluyan
  // entre páginas (evita el hueco en blanco cuando hay muchas entregas).
  const real = `<div class="seccion"><h2>Actividad real <small>(lo que recolectó en el período)</small></h2>${kpis}</div>${porMaterial}${entregas}`;

  return documento(
    cabeceraHtml(`Sucursal · ${perfil.nombre}`, opts.periodo) + datos + real,
  );
}

/** Ficha de UNA recolectora (perfil declarado vs actividad real). */
export function construirPdfRecolectora(opts: {
  periodo: { desde: string; hasta: string };
  /** Foto del recolector embebida como data URI (o null si no tiene). */
  fotoDataUri?: string | null;
  perfil: {
    nombre: string;
    ci: string;
    celular: string;
    edad: number;
    genero: string;
    trabaja_individual: boolean;
    zona: string | null;
    asociacion: string | null;
    departamento: string | null;
    dias_trabajo: string[];
    materiales_habituales: {
      material: string | null;
      cantidad_mensual: number | null;
      precio_venta: number | null;
      es_principal: boolean;
    }[];
    tipos_generador: string[];
  };
  actividad: {
    total: { transacciones: number; kg: number; co2_kg: number; bs: number };
    por_material: { material: string; kg: number; bs: number }[];
    transacciones: {
      fecha: Date | string;
      destino: string;
      kg: number;
      bs: number;
    }[];
  };
}): string {
  const { perfil, actividad } = opts;
  const diaTitulo = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();
  const fechaCorta = (f: Date | string) =>
    new Intl.DateTimeFormat('es-BO', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(f));

  const fila = (k: string, v: string) =>
    `<div class="fila"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`;

  // Datos (con foto a un lado, estilo credencial, solo si la tiene).
  const gridDatos = `<div class="datos">${[
    fila('CI', perfil.ci),
    fila('Edad', `${perfil.edad} años`),
    fila('Género', perfil.genero === 'MUJER' ? 'Mujer' : 'Hombre'),
    fila('Modalidad', perfil.trabaja_individual ? 'Individual' : 'En grupo'),
    fila('Zona', perfil.zona ?? '—'),
    fila('Asociación', perfil.asociacion ?? 'Sin asociación'),
    fila('Departamento', perfil.departamento ?? '—'),
    fila('Celular', perfil.celular),
  ].join('')}</div>`;
  const fotoHtml = opts.fotoDataUri
    ? `<img class="foto" src="${opts.fotoDataUri}" alt="Foto del recolector" />`
    : '';
  const datos = `<div class="seccion"><h2>Datos</h2><div class="datos-wrap">${gridDatos}${fotoHtml}</div></div>`;

  // Perfil declarado.
  const dias = perfil.dias_trabajo.length
    ? `<div class="badges">${perfil.dias_trabajo.map((d) => `<span>${escapeHtml(diaTitulo(d))}</span>`).join('')}</div>`
    : `<p class="subt">No registrados.</p>`;

  const matHab = perfil.materiales_habituales.length
    ? tablaHtml(
        [
          { key: 'material', header: 'Material habitual' },
          { key: 'cantidad_mensual', header: 'Cant/mes', tipo: 'kg' },
          { key: 'precio_venta', header: 'Precio', tipo: 'bs' },
          { key: 'principal', header: 'Principal' },
        ],
        perfil.materiales_habituales.map((m) => ({
          material: m.material ?? '—',
          cantidad_mensual: m.cantidad_mensual,
          precio_venta: m.precio_venta,
          principal: m.es_principal ? 'Sí' : '',
        })),
      )
    : `<p class="subt">No registrados.</p>`;

  const declarado = `<div class="seccion"><h2>Perfil declarado <small>(lo que recoge normalmente)</small></h2>
    <p class="subt" style="margin:0 0 4px">Días que trabaja</p>${dias}
    <p class="subt" style="margin:10px 0 4px">Materiales habituales</p>${matHab}</div>`;

  // Actividad real.
  const kpis = kpisHtml([
    { label: 'Entregas', value: ent(actividad.total.transacciones) },
    { label: 'Recolectado', value: kg(actividad.total.kg) },
    { label: 'CO₂ evitado', value: kg(actividad.total.co2_kg) },
    { label: 'Generado', value: bs(actividad.total.bs) },
  ]);

  const porMaterial = actividad.por_material.length
    ? `<p class="subt" style="margin:0 0 4px">Qué recolectó de verdad</p>` +
      tablaHtml(
        [
          { key: 'material', header: 'Material' },
          { key: 'kg', header: 'Recolectado', tipo: 'kg' },
          { key: 'bs', header: 'Generado', tipo: 'bs' },
        ],
        actividad.por_material.map((m) => ({ material: m.material, kg: m.kg, bs: m.bs })),
      )
    : '';

  const txs = actividad.transacciones.length
    ? `<p class="subt" style="margin:10px 0 4px">Entregas en el período</p>` +
      tablaHtml(
        [
          { key: 'fecha', header: 'Fecha' },
          { key: 'destino', header: 'Destino' },
          { key: 'kg', header: 'Recolectado', tipo: 'kg' },
          { key: 'bs', header: 'Generado', tipo: 'bs' },
        ],
        actividad.transacciones.map((t) => ({
          fecha: fechaCorta(t.fecha),
          destino: t.destino,
          kg: t.kg,
          bs: t.bs,
        })),
      )
    : '';

  // Encabezado + KPIs en `.seccion` (no se parten); tablas fuera para que fluyan
  // entre páginas (evita el hueco en blanco cuando hay muchas transacciones).
  const real = `<div class="seccion"><h2>Actividad real <small>(lo que recolectó en el período)</small></h2>${kpis}</div>${porMaterial}${txs}`;

  return documento(
    cabeceraHtml(`Ficha de recolectora · ${perfil.nombre}`, opts.periodo) +
      datos +
      declarado +
      real,
  );
}

/**
 * Ficha de UN generador: perfil + actividad agregada de sus sucursales. Sigue
 * el patrón de la ficha de sucursal, pero en CAPAS (docs/28) para no doble-contar:
 * KPIs y "Entregas" son a nivel transacción (conteo exacto), y "Resumen por
 * sucursal" es un agregado aparte (una entrega multi-sucursal cuenta en cada una;
 * de ahí la nota al pie). Los kg/Bs de cada entrega son SOLO de este generador.
 */
export function construirPdfGenerador(opts: {
  periodo: { desde: string; hasta: string };
  perfil: {
    nombre: string;
    tipo_generador: string | null;
    contacto_nombre: string | null;
    contacto_telefono: string | null;
    contacto_email: string | null;
    departamentos: string[];
  };
  actividad: {
    total: {
      sucursales: number;
      transacciones: number;
      kg: number;
      co2_kg: number;
      bs: number;
    };
    por_sucursal: {
      sucursal: string;
      ciudad: string;
      entregas: number;
      kg: number;
      co2_kg: number;
      bs: number;
    }[];
    por_material: { material: string; kg: number; bs: number }[];
    entregas: {
      fecha: Date | string;
      recolector: string | null;
      sucursales: number;
      sucursales_nombres: string | null;
      kg: number;
      bs: number;
    }[];
  };
}): string {
  const { perfil, actividad } = opts;
  const fechaCorta = (f: Date | string) =>
    new Intl.DateTimeFormat('es-BO', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(f));

  const fila = (k: string, v: string) =>
    `<div class="fila"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`;

  const contacto = [
    perfil.contacto_nombre,
    perfil.contacto_telefono,
    perfil.contacto_email,
  ]
    .filter((x): x is string => !!x)
    .join(' · ');
  const gridDatos = `<div class="datos">${[
    fila('Tipo', perfil.tipo_generador ?? '—'),
    fila(
      'Departamento(s)',
      perfil.departamentos.length ? perfil.departamentos.join(', ') : '—',
    ),
    ...(contacto ? [fila('Contacto', contacto)] : []),
  ].join('')}</div>`;
  const datos = `<div class="seccion"><h2>Datos</h2>${gridDatos}</div>`;

  const kpis = kpisHtml([
    { label: 'Sucursales', value: ent(actividad.total.sucursales) },
    { label: 'Entregas', value: ent(actividad.total.transacciones) },
    { label: 'Recolectado', value: kg(actividad.total.kg) },
    { label: 'CO₂ evitado', value: kg(actividad.total.co2_kg) },
    { label: 'Generado', value: bs(actividad.total.bs) },
  ]);

  const porSucursal = actividad.por_sucursal.length
    ? `<p class="subt" style="margin:0 0 4px">Resumen por sucursal <small style="color:${GRIS}">(cuánto aportó cada una)</small></p>` +
      tablaHtml(
        [
          { key: 'sucursal', header: 'Sucursal' },
          { key: 'ciudad', header: 'Ciudad' },
          { key: 'kg', header: 'Recolectado', tipo: 'kg' },
          { key: 'bs', header: 'Generado', tipo: 'bs' },
        ],
        actividad.por_sucursal.map((s) => ({
          sucursal: s.sucursal,
          ciudad: s.ciudad,
          kg: s.kg,
          bs: s.bs,
        })),
      )
    : '';

  const porMaterial = actividad.por_material.length
    ? `<p class="subt" style="margin:10px 0 4px">Desglose por material</p>` +
      tablaHtml(
        [
          { key: 'material', header: 'Material' },
          { key: 'kg', header: 'Recolectado', tipo: 'kg' },
          { key: 'bs', header: 'Generado', tipo: 'bs' },
        ],
        actividad.por_material.map((m) => ({
          material: m.material,
          kg: m.kg,
          bs: m.bs,
        })),
      )
    : '';

  const entregas = actividad.entregas.length
    ? `<p class="subt" style="margin:10px 0 4px">Entregas en el período</p>` +
      tablaHtml(
        [
          { key: 'fecha', header: 'Fecha' },
          { key: 'recolector', header: 'Recolector' },
          { key: 'origen', header: 'Origen' },
          { key: 'kg', header: 'Recolectado', tipo: 'kg' },
          { key: 'bs', header: 'Generado', tipo: 'bs' },
        ],
        actividad.entregas.map((e) => ({
          fecha: fechaCorta(e.fecha),
          recolector: e.recolector ?? '—',
          origen: e.sucursales_nombres ?? '—',
          kg: e.kg,
          bs: e.bs,
        })),
      )
    : '';

  // El encabezado + KPIs van en un `.seccion` (page-break-inside: avoid) para
  // no partirse; las tablas quedan FUERA para poder fluir y paginar por filas
  // (si todo va dentro del `.seccion`, un bloque más alto que la página se
  // empuja entero a la hoja siguiente y deja la primera en blanco).
  const real = `<div class="seccion"><h2>Actividad real <small>(lo que aportaron sus sucursales en el período)</small></h2>${kpis}</div>${porSucursal}${porMaterial}${entregas}`;

  return documento(
    cabeceraHtml(`Generador · ${perfil.nombre}`, opts.periodo) + datos + real,
  );
}
