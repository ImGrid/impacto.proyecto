/**
 * Base de conocimiento de factores de CO₂ evitado por reciclaje, ENFOCADA EN
 * BOLIVIA.
 *
 * Es la fuente de las SUGERENCIAS que ve el admin al crear/editar un material
 * (NO toca los factores que el cliente ya cargó: el admin confirma o ignora).
 *
 * Dos cosas a entender:
 *  - El FACTOR de CO₂ es una propiedad de la química del material (un kg de PET
 *    evita ~lo mismo en cualquier país), así que viene de fuentes primarias
 *    internacionales: EPA WARM v16 (2023), DEFRA 2024, JRC EU, worldsteel, IAI,
 *    asociaciones de metales (ILA/IZA/ITA), WRAP. Detalle y URLs en docs/35.
 *  - Lo BOLIVIANO es: (a) QUÉ materiales se incluyen (solo lo que de verdad se
 *    recicla en Bolivia) y (b) CÓMO se llaman (los `alias` = jerga boliviana
 *    confirmada en fuentes: "fierro viejo", "casco", "garrafa", "plastoformo",
 *    "lavandina", "alambre"…). Para lo electro-intensivo (aluminio, plásticos)
 *    el factor debería ajustarse a la red de Bolivia (~0,42 tCO₂/MWh, docs/32).
 *
 * Factor en kgCO₂e EVITADO por kg reciclado. `peso_unitario_kg` solo para
 * materiales que se cuentan por UNIDAD. Materiales SIN factor confiable (pilas
 * domésticas, madera, cuero) NO se listan: el motor devuelve "no encontrado" y
 * el admin lo carga a mano (mejor eso que inventar un número).
 */

export type UnidadRef = 'KG' | 'UNIDAD';
export type ConfianzaRef = 'alta' | 'media' | 'baja';

export interface MaterialReferencia {
  canonico: string;
  factor_co2: number;
  unidad: UnidadRef;
  peso_unitario_kg?: number;
  fuente: string;
  anio: number;
  confianza: ConfianzaRef;
  alias: string[];
  nota?: string;
}

export const CO2_REFERENCIA: MaterialReferencia[] = [
  // ============================ PLÁSTICOS ============================
  {
    canonico: 'PET',
    factor_co2: 1.2,
    unidad: 'KG',
    fuente: 'EPA WARM v16',
    anio: 2023,
    confianza: 'alta',
    alias: ['pet', 'botella', 'botellas', 'botella pet', 'botella de gaseosa', 'gaseosa', 'botella plastica', 'refresco', 'pet cristal', 'plastico cristal', 'tereftalato'],
  },
  {
    canonico: 'Polietileno de Alta densidad',
    factor_co2: 0.9,
    unidad: 'KG',
    fuente: 'EPA WARM v16',
    anio: 2023,
    confianza: 'alta',
    alias: ['hdpe', 'pead', 'polietileno de alta densidad', 'polietileno alta', 'plastico duro', 'plastico de soplo', 'soplado', 'plastico soplado', 'bidon', 'garrafa', 'botella de lavandina', 'lavandina', 'botella de yogurt', 'balde', 'tina', 'envase de shampoo'],
  },
  {
    canonico: 'Polietileno de Baja densidad',
    factor_co2: 1.5,
    unidad: 'KG',
    fuente: 'DEFRA 2024',
    anio: 2024,
    confianza: 'media',
    alias: ['ldpe', 'pebd', 'polietileno de baja densidad', 'polietileno baja', 'nailon', 'nylon', 'bolsa', 'bolsas', 'bolsa plastica', 'film', 'film plastico', 'stretch', 'plastico film'],
    nota: 'En Bolivia "nailon" = film/bolsa plástica (LDPE). El film fino tiene poco mercado.',
  },
  {
    canonico: 'Polipropileno',
    factor_co2: 0.9,
    unidad: 'KG',
    fuente: 'EPA WARM v16',
    anio: 2023,
    confianza: 'alta',
    alias: ['pp', 'polipropileno', 'tapas', 'tapa', 'chapas', 'chapas de gaseosa', 'envase de yogurt', 'silla de plastico', 'plastico pp'],
  },
  {
    canonico: 'PVC',
    factor_co2: 1.4,
    unidad: 'KG',
    fuente: 'JRC EU EUR 30668',
    anio: 2021,
    confianza: 'baja',
    alias: ['pvc', 'tubo', 'tuberia', 'tubos', 'manguera', 'policloruro de vinilo'],
    nota: 'Poco mercado de reciclaje en Bolivia. Factor de baja confianza (JRC).',
  },
  {
    canonico: 'Poliestireno',
    factor_co2: 1.3,
    unidad: 'KG',
    fuente: 'JRC EU EUR 30668',
    anio: 2021,
    confianza: 'baja',
    alias: ['poliestireno', 'ps', 'eps', 'poliestireno expandido', 'plastoformo', 'plastoform'],
    nota: 'En Bolivia es "plastoformo" y casi NO se recicla (sin comprador). Factor de baja confianza.',
  },
  // ============================ PAPEL Y CARTÓN ============================
  // Nota: para papel/cartón se usa el valor LatAm (~0,9-1,0), NO el de EPA WARM
  // (~3-4), que está inflado por créditos de carbono forestal (docs/35 §1).
  {
    canonico: 'Cartón',
    factor_co2: 0.9,
    unidad: 'KG',
    fuente: 'CertiRecicla (EPA+DEFRA)',
    anio: 2024,
    confianza: 'media',
    alias: ['carton', 'caja', 'cajas', 'carton corrugado', 'corrugado', 'cartulina', 'cajas de carton'],
  },
  {
    canonico: 'Papel Mixto',
    factor_co2: 1.0,
    unidad: 'KG',
    fuente: 'CertiRecicla (EPA+DEFRA)',
    anio: 2024,
    confianza: 'media',
    alias: ['papel mixto', 'papel', 'papeles', 'papel de colores', 'papel cuaderno'],
  },
  {
    canonico: 'Papel Archivo',
    factor_co2: 1.0,
    unidad: 'KG',
    fuente: 'CertiRecicla (EPA+DEFRA)',
    anio: 2024,
    confianza: 'media',
    alias: ['papel archivo', 'papel blanco', 'bond', 'papel bond', 'papel de oficina', 'papel oficina'],
  },
  {
    canonico: 'Periódico',
    factor_co2: 0.9,
    unidad: 'KG',
    fuente: 'EPA WARM v16 / LatAm',
    anio: 2023,
    confianza: 'media',
    alias: ['periodico', 'periodicos', 'diario', 'diarios', 'papel periodico', 'prensa'],
  },
  {
    canonico: 'Revistas',
    factor_co2: 1.0,
    unidad: 'KG',
    fuente: 'EPA WARM v16 / LatAm',
    anio: 2023,
    confianza: 'media',
    alias: ['revista', 'revistas', 'couche', 'papel couche', 'catalogo', 'catalogos'],
  },
  {
    canonico: 'Tetrapack',
    factor_co2: 0.9,
    unidad: 'KG',
    fuente: 'Proxy cartón (fracción fibra)',
    anio: 2023,
    confianza: 'baja',
    alias: ['tetrapack', 'tetrapak', 'tetrabrik', 'caja de leche', 'caja de jugo', 'envase multicapa', 'envase de leche tetra'],
    nota: 'Sin factor primario propio. Aproximado por su fracción de cartón (~70%). Mercado limitado en Bolivia.',
  },
  {
    canonico: 'Maples de Huevo',
    factor_co2: 0.9,
    unidad: 'UNIDAD',
    peso_unitario_kg: 0.05,
    fuente: 'Proxy cartón (pulpa moldeada)',
    anio: 2023,
    confianza: 'media',
    alias: ['maples de huevo', 'maple de huevo', 'maples', 'maple', 'carton de huevo', 'cubeta de huevo', 'cubetas de huevo'],
  },
  // ============================ METALES ============================
  {
    canonico: 'Aluminio',
    factor_co2: 10.0,
    unidad: 'KG',
    fuente: 'EPA WARM v16',
    anio: 2023,
    confianza: 'alta',
    alias: ['aluminio', 'lata', 'latas', 'latas de gaseosa', 'tarro', 'tarros', 'aluminio de lata', 'olla', 'ollas', 'ollas de aluminio', 'aluminio grueso', 'plancha de aluminio', 'plancha litografica'],
  },
  {
    canonico: 'Chatarra',
    factor_co2: 1.5,
    unidad: 'KG',
    fuente: 'worldsteel',
    anio: 2023,
    confianza: 'alta',
    alias: ['chatarra', 'fierro', 'fierro viejo', 'fierritos', 'fierros', 'chatarra negra', 'metal', 'acero', 'hierro', 'viruta', 'metal ferroso'],
  },
  {
    canonico: 'Latas de Acero',
    factor_co2: 2.0,
    unidad: 'KG',
    fuente: 'EPA WARM v16',
    anio: 2023,
    confianza: 'alta',
    alias: ['latas de acero', 'lata de acero', 'hojalata', 'lata de conserva', 'latas de conserva', 'lata de leche'],
    nota: 'La hojalata se recicla como acero (la capa de estaño es <1%). NO usar el factor del estaño metálico.',
  },
  {
    canonico: 'Cobre',
    factor_co2: 2.5,
    unidad: 'KG',
    fuente: 'ICA / Nuss & Eckelman',
    anio: 2023,
    confianza: 'media',
    alias: ['cobre', 'alambre', 'alambre de cobre', 'cable', 'cable de cobre', 'cables'],
  },
  {
    canonico: 'Bronce',
    factor_co2: 2.5,
    unidad: 'KG',
    fuente: 'Proxy cobre (aleación)',
    anio: 2023,
    confianza: 'media',
    alias: ['bronce', 'laton', 'aleacion de cobre'],
    nota: 'Proxy del cobre (es aleación de cobre); sin factor primario propio.',
  },
  {
    canonico: 'Plomo',
    factor_co2: 1.7,
    unidad: 'KG',
    fuente: 'Nuss & Eckelman / ILA',
    anio: 2016,
    confianza: 'alta',
    alias: ['plomo', 'bateria', 'baterias', 'bateria de auto', 'acumulador', 'acumuladores'],
    nota: 'De baterías plomo-ácido (autos) — muy reciclado en Bolivia. NO aplica a pilas domésticas (AA), que no tienen factor de CO₂ confiable.',
  },
  {
    canonico: 'Zinc',
    factor_co2: 2.9,
    unidad: 'KG',
    fuente: 'International Zinc Association',
    anio: 2023,
    confianza: 'media',
    alias: ['zinc', 'cinc'],
  },
  {
    canonico: 'Estaño',
    factor_co2: 4.0,
    unidad: 'KG',
    fuente: 'International Tin Association',
    anio: 2023,
    confianza: 'alta',
    alias: ['estaño', 'estanio'],
    nota: 'Estaño METÁLICO (soldadura, lingote). La hojalata (latas) NO es esto: va como acero.',
  },
  // ============================ VIDRIO ============================
  {
    canonico: 'Botellas de Vidrio',
    factor_co2: 0.31,
    unidad: 'UNIDAD',
    peso_unitario_kg: 0.3,
    fuente: 'EPA WARM v16',
    anio: 2023,
    confianza: 'alta',
    alias: ['botellas de vidrio', 'botella de vidrio', 'vidrio', 'vidrios', 'casco', 'casco de vidrio', 'envase de vidrio', 'envase retornable', 'vidrio transparente', 'vidrio verde', 'vidrio ambar'],
  },
  {
    canonico: 'Vidrio Plano',
    factor_co2: 0.31,
    unidad: 'KG',
    fuente: 'Proxy vidrio de envase',
    anio: 2023,
    confianza: 'media',
    alias: ['vidrio plano', 'ventana', 'ventanas', 'espejo', 'espejos', 'vidrio de ventana'],
    nota: 'Sin factor propio en las fuentes; se usa el mismo del vidrio de envase. Poco mercado en Bolivia.',
  },
  // ============================ OTROS ============================
  {
    canonico: 'Hule',
    factor_co2: 0.42,
    unidad: 'KG',
    fuente: 'EPA WARM v16 (Tires)',
    anio: 2023,
    confianza: 'media',
    alias: ['hule', 'goma', 'caucho', 'llanta', 'llantas', 'neumatico', 'neumaticos', 'rueda'],
    nota: 'Factor de neumáticos (incluye recuperación del acero del neumático). El caucho puro puede variar.',
  },
  {
    canonico: 'Ropa',
    factor_co2: 0.7,
    unidad: 'KG',
    fuente: 'WRAP (reciclaje de fibra)',
    anio: 2023,
    confianza: 'media',
    alias: ['ropa', 'textil', 'textiles', 'tela', 'telas', 'prendas', 'ropa usada'],
    nota: 'Valor de reciclaje de fibra (~0,7). Si la ropa se REUTILIZA, el ahorro es mayor (~4 kg/kg).',
  },
  {
    canonico: 'Electrónicos',
    factor_co2: 1.0,
    unidad: 'KG',
    fuente: 'EPA WARM v16 (mezcla)',
    anio: 2023,
    confianza: 'media',
    alias: ['electronicos', 'electronico', 'chatarra electronica', 'e-waste', 'aparatos electronicos', 'aparatos viejos', 'residuos electronicos', 'motor', 'motores'],
    nota: 'Valor de mezcla. Varía por tipo (CPU ~1,6 vs periféricos ~0,4).',
  },
  {
    canonico: 'Aceite usado',
    factor_co2: 0.5,
    unidad: 'KG',
    fuente: 'LCA (re-refino)',
    anio: 2021,
    confianza: 'media',
    alias: ['aceite usado', 'aceite', 'aceite de cocina', 'aceite quemado', 'aceite reciclable'],
    nota: 'Asume re-refino. ~0,5 kgCO₂e/kg ≈ 0,46 por litro.',
  },
];
