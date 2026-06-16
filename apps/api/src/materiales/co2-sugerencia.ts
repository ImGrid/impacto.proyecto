import { normalizarParaComparar } from '../common/helpers/transform.helpers';
import { CO2_REFERENCIA, MaterialReferencia } from './co2-referencia';
// fuse.js v7 declara `export = Fuse` (CommonJS). El import nativo de TS
// `import X = require(...)` da la clase (constructable) en TIPO y en RUNTIME sin
// necesidad de esModuleInterop. (Verificado: require('fuse.js') === constructor;
// `import Fuse from` habría dado `.default` = undefined → crash, como sharp.)
import Fuse = require('fuse.js');

type Termino = { idx: number; termino: string };

// Corpus de búsqueda: nombre canónico + alias de cada material, normalizados
// (minúsculas, sin tildes, espacios colapsados — reusa el helper del proyecto).
const TERMINOS: Termino[] = CO2_REFERENCIA.flatMap((m, idx) =>
  [m.canonico, ...m.alias].map((t) => ({
    idx,
    termino: normalizarParaComparar(t),
  })),
);

const fuse = new Fuse(TERMINOS, {
  keys: ['termino'],
  includeScore: true,
  threshold: 0.34, // 0 = exacto, 1 = cualquier cosa. Conservador: mejor "no
  // encontrado" que sugerir un material equivocado.
  ignoreLocation: true,
  minMatchCharLength: 2,
});

export type SugerenciaFactor =
  | { encontrado: false }
  | {
      encontrado: true;
      material_canonico: string;
      factor_co2: number;
      unidad: 'KG' | 'UNIDAD';
      peso_unitario_kg: number | null;
      fuente: string;
      anio: number;
      confianza: 'alta' | 'media' | 'baja';
      metodo: 'exacto' | 'aproximado';
      nota?: string;
    };

/**
 * Dado el nombre de un material, SUGIERE un factor de CO₂ (y peso por unidad si
 * aplica) buscando en la base de conocimiento curada (`co2-referencia.ts`):
 *   1) match exacto contra el nombre canónico o algún alias,
 *   2) match aproximado (fuzzy, Fuse.js) si no hubo exacto,
 *   3) "no encontrado" si nada matchea bien (el admin lo carga a mano).
 *
 * NUNCA inventa un número: solo devuelve valores que están en la tabla curada.
 * El resultado es una SUGERENCIA; el admin la confirma, edita o ignora.
 */
export function sugerirFactor(nombre: string): SugerenciaFactor {
  const q = normalizarParaComparar(nombre ?? '');
  if (q.length < 2) return { encontrado: false };

  // 1) Exacto: el nombre completo es un canónico o alias.
  const exacto = TERMINOS.find((t) => t.termino === q);
  if (exacto) return armar(CO2_REFERENCIA[exacto.idx], 'exacto');

  // 2) Contención: el nombre CONTIENE un alias conocido. Maneja frases como
  //    "olla de aluminio" → "aluminio", "tubo de pvc" → "tubo". Se queda con el
  //    alias más específico (el más largo) para evitar falsos del fuzzy.
  const cont = contencion(q);
  if (cont != null) return armar(CO2_REFERENCIA[cont], 'aproximado');

  // 3) Fuzzy SOLO para errores de tipeo (umbral MUY estricto 0,15). Más laxo
  //    dejaba pasar falsos positivos de palabras cortas ("pila"→HDPE,
  //    "cuero"→"acero"→Chatarra). A 0,15 solo pasan typos de ~1 letra.
  const res = fuse.search(q);
  if (res.length > 0 && (res[0].score ?? 1) <= 0.15) {
    return armar(CO2_REFERENCIA[res[0].item.idx], 'aproximado');
  }

  // 4) Nada matchea bien: el admin lo carga a mano.
  return { encontrado: false };
}

/**
 * ¿El nombre contiene un alias conocido como palabra/frase? Devuelve el índice
 * del material del alias MÁS LARGO encontrado (el más específico), o null.
 * Usa coincidencia por palabra completa (no subcadena suelta) para no matchear
 * un alias corto dentro de otra palabra.
 */
function contencion(q: string): number | null {
  const palabras = new Set(q.split(' '));
  const qPad = ` ${q} `;
  let idx: number | null = null;
  let mejorLen = 0;
  for (const t of TERMINOS) {
    const term = t.termino;
    const hit = term.includes(' ')
      ? qPad.includes(` ${term} `) // alias de varias palabras: frase contigua
      : palabras.has(term); // alias de una palabra: palabra exacta del nombre
    if (hit && term.length > mejorLen) {
      mejorLen = term.length;
      idx = t.idx;
    }
  }
  return idx;
}

function armar(
  m: MaterialReferencia,
  metodo: 'exacto' | 'aproximado',
): SugerenciaFactor {
  // Si el match fue aproximado, el match en sí tiene incertidumbre → no
  // afirmamos confianza 'alta': la bajamos a 'media'.
  const confianza =
    metodo === 'aproximado' && m.confianza === 'alta' ? 'media' : m.confianza;
  return {
    encontrado: true,
    material_canonico: m.canonico,
    factor_co2: m.factor_co2,
    unidad: m.unidad,
    peso_unitario_kg: m.peso_unitario_kg ?? null,
    fuente: m.fuente,
    anio: m.anio,
    confianza,
    metodo,
    ...(m.nota ? { nota: m.nota } : {}),
  };
}
