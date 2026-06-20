/**
 * Gráficos como SVG generado EN EL SERVIDOR (string), para embeber en el HTML
 * de los PDF de reportes (investigación jun 2026, ~30 fuentes expertas).
 *
 * Por qué SVG-a-mano y no una librería de charts:
 * - Vectorial: nítido en el PDF a cualquier zoom y con texto seleccionable (a
 *   diferencia de canvas/Chart.js, que rasteriza y se ve borroso al imprimir).
 * - Sin DOM ni navegador: se construye como string puro en Node, así que NO hay
 *   canvas asíncrono ni animación que esperar antes de `page.pdf()` — elimina la
 *   causa #1 de "PDF con el gráfico vacío o a medias".
 * - Cero dependencias: una barra es un <rect> (regla de tres); la dona de género
 *   son 2 arcos con un helper de geometría de ~10 líneas.
 *
 * Diseño para audiencia NO técnica (abogados/administradores), siguiendo a
 * Few / Kosara / Nussbaumer Knaflic / NN-g / Tufte: barras horizontales
 * ORDENADAS por valor, con el número ETIQUETADO en la barra (sin leyenda que
 * obligue a cruzar color↔dato), eje desde 0, un color de marca, sin 3D ni
 * chartjunk. La dona se reserva SOLO para género (2 categorías que suman 100%).
 *
 * El color se imprime gracias al `print-color-adjust: exact` global del PDF
 * (regla `*` en pdf.util) + `printBackground:true` en pdf.service.
 */

// Paleta de marca (espejo de pdf.util).
const TEAL = '#0C5C63';
const AZUL = '#007ECC';
const GRIS = '#666666';

const nfBO = (n: number, d = 2) =>
  new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);

/** Escapa texto interpolado en el SVG/HTML (anti-inyección). */
function escapeSvg(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function valorFmt(v: number, formato: 'kg' | 'bs'): string {
  return formato === 'bs' ? `Bs ${nfBO(v)}` : `${nfBO(v)} kg`;
}

/** Corta etiquetas largas (los nombres de zona/empresa pueden ser extensos). */
function truncar(s: string, max = 28): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

type ItemGrafico = { label: string; value: number };

/**
 * Barras horizontales ordenadas (top-N). `items` debe venir YA ordenado por
 * valor desc (los reportes lo entregan así desde el SQL). Devuelve `null` si
 * quedan menos de `minItems` barras con valor > 0 — un gráfico de 1 barra no
 * comunica nada (guarda anti-degenerado: si un filtro reduce a 1 categoría, el
 * reporte sale solo con la tabla).
 */
export function svgBarras(opts: {
  items: ItemGrafico[];
  formato: 'kg' | 'bs';
  titulo?: string;
  maxItems?: number;
  minItems?: number;
  /** Clase CSS extra para el <figure> (p.ej. layout side-by-side). */
  clase?: string;
}): string | null {
  const minItems = opts.minItems ?? 3;
  const top = opts.items
    .filter((i) => i.value > 0)
    .slice(0, opts.maxItems ?? 10);
  if (top.length < minItems) return null;

  const W = 700;
  const labelW = 200; // columna de nombres (a la izquierda de las barras)
  const valW = 82; // espacio a la derecha para el valor etiquetado
  const trackX = labelW + 8;
  const trackW = W - trackX - valW;
  const rowH = 26;
  const barH = 15;
  const padTop = 6;
  const H = padTop + top.length * rowH + 4;

  const max = Math.max(...top.map((i) => i.value)) || 1;

  const filas = top
    .map((it, i) => {
      const cy = padTop + i * rowH + rowH / 2;
      const barW = Math.max(1, (it.value / max) * trackW);
      return `
      <text x="${labelW}" y="${cy}" text-anchor="end" dominant-baseline="central" font-size="10.5" fill="#1a1a1a">${escapeSvg(
        truncar(it.label),
      )}</text>
      <rect x="${trackX}" y="${(cy - barH / 2).toFixed(1)}" width="${barW.toFixed(
        1,
      )}" height="${barH}" rx="2" fill="${TEAL}" />
      <text x="${(trackX + barW + 5).toFixed(1)}" y="${cy}" dominant-baseline="central" font-size="10" fill="${GRIS}">${escapeSvg(
        valorFmt(it.value, opts.formato),
      )}</text>`;
    })
    .join('');

  const cap = opts.titulo ? `<p class="cap">${escapeSvg(opts.titulo)}</p>` : '';
  const clase = opts.clase ? ` ${opts.clase}` : '';
  return `<figure class="grafico${clase}">${cap}<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" font-family="'Segoe UI','Helvetica Neue',Arial,sans-serif">${filas}</svg></figure>`;
}

/**
 * Path de un sector de anillo (dona) entre dos ángulos (radianes, sentido
 * horario, 0 = derecha). El flag de arco grande se calcula según si el sector
 * supera 180° — la parte frágil de "dibujar arcos a mano", aquí controlada para
 * las 2 categorías del género.
 */
function arco(
  cx: number,
  cy: number,
  rOut: number,
  rIn: number,
  a0: number,
  a1: number,
): string {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const p = (r: number, a: number) =>
    `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(rOut, a0)} A${rOut},${rOut} 0 ${large} 1 ${p(
    rOut,
    a1,
  )} L${p(rIn, a1)} A${rIn},${rIn} 0 ${large} 0 ${p(rIn, a0)} Z`;
}

/**
 * Dona de distribución por género (Mujeres/Hombres). Único caso de dona válido
 * para no-técnicos: 2 categorías que suman 100%. Etiqueta cada porción al lado
 * con su color + valor + % (sin obligar a cruzar una leyenda lejana). Devuelve
 * `null` si no hay personas.
 */
export function svgDonaGenero(opts: {
  mujeres: number;
  hombres: number;
  titulo?: string;
  /** Clase CSS extra para el <figure> (p.ej. layout side-by-side). */
  clase?: string;
}): string | null {
  const total = opts.mujeres + opts.hombres;
  if (total <= 0) return null;

  const segs = [
    { label: 'Mujeres', value: opts.mujeres, color: TEAL },
    { label: 'Hombres', value: opts.hombres, color: AZUL },
  ].filter((s) => s.value > 0);

  const cx = 70;
  const cy = 70;
  const rOut = 60;
  const rIn = 34;

  let paths: string;
  if (segs.length === 1) {
    // 100% un solo género: anillo completo en dos semicírculos (evita el arco
    // degenerado cuando inicio == fin).
    const c = segs[0].color;
    paths =
      `<path d="${arco(cx, cy, rOut, rIn, -Math.PI / 2, Math.PI / 2)}" fill="${c}"/>` +
      `<path d="${arco(cx, cy, rOut, rIn, Math.PI / 2, (3 * Math.PI) / 2)}" fill="${c}"/>`;
  } else {
    let a = -Math.PI / 2; // arranca arriba
    paths = segs
      .map((s) => {
        const a1 = a + (s.value / total) * 2 * Math.PI;
        const d = arco(cx, cy, rOut, rIn, a, a1);
        a = a1;
        return `<path d="${d}" fill="${s.color}"/>`;
      })
      .join('');
  }

  const leyenda = segs
    .map((s) => {
      const pct = nfBO((s.value / total) * 100, 0);
      return `<div class="it"><span class="sw" style="background:${s.color}"></span>${escapeSvg(
        s.label,
      )}: <strong>${nfBO(s.value, 0)}</strong> (${pct}%)</div>`;
    })
    .join('');

  const cap = opts.titulo ? `<p class="cap">${escapeSvg(opts.titulo)}</p>` : '';
  const clase = opts.clase ? ` ${opts.clase}` : '';
  return `<figure class="grafico${clase}">${cap}<div class="grafico-flex"><svg viewBox="0 0 140 140" width="140" height="140" role="img">${paths}</svg><div class="dona-leyenda">${leyenda}</div></div></figure>`;
}
