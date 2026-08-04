import ExcelJS = require('exceljs');

/**
 * Generación de Excel de reportes con la identidad de Triple Impacto
 * (docs/14 + docs/27). Reglas aplicadas:
 * - Cabecera con fondo teal de marca (#0C5C63) y texto blanco; congelada.
 * - Números guardados CRUDOS + numFmt → Excel los muestra en es-BO por locale
 *   (coma decimal, punto de miles). NUNCA texto pre-formateado.
 * - Fila de TOTAL en negrita con borde superior.
 * - Saneo anti inyección de fórmulas (OWASP): celdas de texto que empiezan con
 *   = + - @ (o tab/CR) se prefijan con comilla simple.
 */

const TEAL = 'FF0C5C63'; // color de marca (sidebar/estructura)
const ZEBRA = 'FFEFF3F3'; // teal muy claro para filas alternas

export type ExcelColumna = {
  header: string;
  key: string;
  width?: number;
  numFmt?: string; // p.ej. '#,##0.00" kg"', '"Bs "#,##0.00', '0.0"%"', '#,##0'
  align?: 'left' | 'right';
};

/** Anti CSV/formula injection: prefija con ' las celdas de texto peligrosas. */
function sanearTexto(v: unknown): unknown {
  if (typeof v === 'string' && /^[=+\-@\t\r]/.test(v)) return `'${v}`;
  return v;
}

export async function construirExcelReporte(opts: {
  titulo: string;
  periodo: { desde: string; hasta: string };
  columnas: ExcelColumna[];
  filas: Record<string, unknown>[];
  total?: Record<string, unknown>;
  totalLabel?: string;
  nombreHoja?: string;
  /** Texto del período si no es un rango de fechas (p. ej. "Todo el histórico"). */
  periodoLabel?: string;
  /** Nota al pie de la tabla (p. ej. sobre qué se calculan los porcentajes). */
  nota?: string;
}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Triple Impacto';
  wb.created = new Date();

  const ws = wb.addWorksheet(opts.nombreHoja ?? 'Reporte', {
    views: [{ state: 'frozen', ySplit: 3 }], // congela título + cabecera
  });

  const ncols = opts.columnas.length;

  // Anchos y formato por columna.
  opts.columnas.forEach((c, i) => {
    const col = ws.getColumn(i + 1);
    col.width = c.width ?? 16;
    if (c.numFmt) col.numFmt = c.numFmt;
  });

  // Fila 1: título.
  ws.mergeCells(1, 1, 1, ncols);
  const t = ws.getCell(1, 1);
  t.value = opts.titulo;
  t.font = { name: 'Calibri', bold: true, size: 14, color: { argb: TEAL } };
  ws.getRow(1).height = 22;

  // Fila 2: subtítulo (período).
  ws.mergeCells(2, 1, 2, ncols);
  const sub = ws.getCell(2, 1);
  sub.value = opts.periodoLabel
    ? `Período: ${opts.periodoLabel}`
    : `Período: ${opts.periodo.desde.slice(0, 10)} a ${opts.periodo.hasta.slice(0, 10)}`;
  sub.font = { name: 'Calibri', size: 10, color: { argb: 'FF666666' } };
  ws.getRow(2).height = 16;

  // Fila 3: cabecera de columnas.
  const header = ws.getRow(3);
  opts.columnas.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: c.align === 'right' ? 'right' : 'left',
    };
  });
  header.height = 20;

  // Filas de datos.
  opts.filas.forEach((fila, idx) => {
    const row = ws.getRow(4 + idx);
    opts.columnas.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      cell.value = sanearTexto(fila[c.key]) as ExcelJS.CellValue;
      cell.alignment = { horizontal: c.align === 'right' ? 'right' : 'left' };
    });
    if (idx % 2 === 1) {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      });
    }
  });

  // Fila de TOTAL.
  if (opts.total) {
    const r = ws.getRow(4 + opts.filas.length);
    opts.columnas.forEach((c, i) => {
      const cell = r.getCell(i + 1);
      if (i === 0) cell.value = opts.totalLabel ?? 'TOTAL';
      else if (opts.total![c.key] != null)
        cell.value = opts.total![c.key] as ExcelJS.CellValue;
      cell.font = { name: 'Calibri', bold: true };
      cell.border = { top: { style: 'thin', color: { argb: TEAL } } };
      cell.alignment = { horizontal: c.align === 'right' ? 'right' : 'left' };
    });
  }

  // Nota al pie, una fila por debajo del TOTAL (fuera del autoFilter, que solo
  // abarca la cabecera, para que no se cuele como si fuera un dato).
  if (opts.nota) {
    const rNota = 4 + opts.filas.length + (opts.total ? 1 : 0) + 1;
    ws.mergeCells(rNota, 1, rNota, ncols);
    const cell = ws.getCell(rNota, 1);
    cell.value = opts.nota;
    cell.font = { name: 'Calibri', size: 9, italic: true, color: { argb: 'FF666666' } };
    cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  }

  // Filtro automático sobre la cabecera.
  ws.autoFilter = {
    from: { row: 3, column: 1 },
    to: { row: 3, column: ncols },
  };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

const nfBO = (n: number, d = 2) =>
  new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(n);

/**
 * Excel de la matriz material × tipo de generador: tabla PIVOTE (materiales en
 * filas, tipos en columnas, kg en celdas) — NO una lista plana. Espeja la
 * presentación en pantalla. Pensado para que el usuario lea el cruce de un
 * vistazo.
 */
export async function construirExcelMatriz(opts: {
  periodo: { desde: string; hasta: string };
  items: { material: string; tipo_generador: string; kg: number }[];
  totalKg: number;
}): Promise<Buffer> {
  // Orden por kg total descendente (igual que la pantalla).
  const sumPor = (campo: 'material' | 'tipo_generador') => {
    const m = new Map<string, number>();
    for (const it of opts.items)
      m.set(it[campo], (m.get(it[campo]) ?? 0) + it.kg);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };
  const materiales = sumPor('material');
  const tipos = sumPor('tipo_generador');
  const celda = new Map<string, number>();
  for (const it of opts.items)
    celda.set(`${it.material}|${it.tipo_generador}`, it.kg);
  const kg = (mat: string, t: string) => celda.get(`${mat}|${t}`) ?? 0;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Triple Impacto';
  wb.created = new Date();
  const ws = wb.addWorksheet('Matriz', {
    views: [{ state: 'frozen', ySplit: 3, xSplit: 1 }],
  });

  const ncols = tipos.length + 2; // Material + tipos + Total
  ws.getColumn(1).width = 28;
  for (let i = 0; i < tipos.length + 1; i++) {
    const col = ws.getColumn(2 + i);
    col.width = 16;
    col.numFmt = '#,##0.00" kg"';
  }

  ws.mergeCells(1, 1, 1, ncols);
  const t = ws.getCell(1, 1);
  t.value = 'Material × tipo de generador';
  t.font = { name: 'Calibri', bold: true, size: 14, color: { argb: TEAL } };
  ws.mergeCells(2, 1, 2, ncols);
  ws.getCell(2, 1).value = `Período: ${opts.periodo.desde.slice(0, 10)} a ${opts.periodo.hasta.slice(0, 10)} · kilos (kg)`;
  ws.getCell(2, 1).font = { name: 'Calibri', size: 10, color: { argb: 'FF666666' } };

  // Cabecera.
  const header = ws.getRow(3);
  const setHead = (col: number, val: string, align: 'left' | 'right') => {
    const c = header.getCell(col);
    c.value = val;
    c.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
    c.alignment = { horizontal: align, vertical: 'middle' };
  };
  setHead(1, 'Material', 'left');
  tipos.forEach((tp, i) => setHead(2 + i, tp, 'right'));
  setHead(ncols, 'Total', 'right');
  header.height = 20;

  // Filas de materiales.
  materiales.forEach((mat, idx) => {
    const row = ws.getRow(4 + idx);
    row.getCell(1).value = mat;
    tipos.forEach((tp, i) => {
      const v = kg(mat, tp);
      if (v > 0) row.getCell(2 + i).value = v; // 0 → celda vacía (limpio)
    });
    const totalFila = tipos.reduce((s, tp) => s + kg(mat, tp), 0);
    const cTot = row.getCell(ncols);
    cTot.value = totalFila;
    cTot.font = { name: 'Calibri', bold: true };
    if (idx % 2 === 1)
      row.eachCell({ includeEmpty: true }, (c) => {
        if (!c.fill || c.fill.type !== 'pattern')
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      });
  });

  // Fila TOTAL (columnas).
  const totalRow = ws.getRow(4 + materiales.length);
  totalRow.getCell(1).value = 'TOTAL';
  tipos.forEach((tp, i) => {
    totalRow.getCell(2 + i).value = materiales.reduce((s, m) => s + kg(m, tp), 0);
  });
  totalRow.getCell(ncols).value = opts.totalKg;
  totalRow.eachCell({ includeEmpty: true }, (c) => {
    c.font = { name: 'Calibri', bold: true };
    c.border = { top: { style: 'thin', color: { argb: TEAL } } };
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Excel "ficha" de UNA recolectora: NO es una tabla de filas, sino un perfil
 * con secciones (datos + perfil declarado + actividad real). Pensado como una
 * credencial legible para el usuario, comparando lo declarado con lo real.
 */
export async function construirExcelRecolectora(opts: {
  periodo: { desde: string; hasta: string };
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
}): Promise<Buffer> {
  const { perfil, actividad } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Triple Impacto';
  wb.created = new Date();
  const ws = wb.addWorksheet('Ficha');
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 26;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 16;

  let r = 1;
  const seccion = (titulo: string) => {
    ws.mergeCells(r, 1, r, 4);
    const c = ws.getCell(r, 1);
    c.value = titulo;
    c.font = { name: 'Calibri', bold: true, size: 12, color: { argb: TEAL } };
    r++;
  };
  const dato = (label: string, value: string) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { name: 'Calibri', color: { argb: 'FF666666' } };
    ws.mergeCells(r, 2, r, 4);
    ws.getCell(r, 2).value = value;
    r++;
  };

  // Título.
  ws.mergeCells(r, 1, r, 4);
  ws.getCell(r, 1).value = `Ficha de recolectora · ${perfil.nombre}`;
  ws.getCell(r, 1).font = { name: 'Calibri', bold: true, size: 14, color: { argb: TEAL } };
  r++;
  ws.mergeCells(r, 1, r, 4);
  ws.getCell(r, 1).value = `Período: ${opts.periodo.desde.slice(0, 10)} a ${opts.periodo.hasta.slice(0, 10)}`;
  ws.getCell(r, 1).font = { name: 'Calibri', size: 10, color: { argb: 'FF666666' } };
  r += 2;

  seccion('Datos');
  dato('CI', perfil.ci);
  dato('Edad', `${perfil.edad} años`);
  dato('Género', perfil.genero === 'MUJER' ? 'Mujer' : 'Hombre');
  dato('Modalidad', perfil.trabaja_individual ? 'Individual' : 'En grupo');
  dato('Zona', perfil.zona ?? '—');
  dato('Asociación', perfil.asociacion ?? 'Sin asociación');
  dato('Departamento', perfil.departamento ?? '—');
  dato('Celular', perfil.celular);
  r++;

  seccion('Perfil declarado (lo que recoge normalmente)');
  dato('Días que trabaja', perfil.dias_trabajo.length ? perfil.dias_trabajo.map(diaTitulo).join(', ') : 'No registrados');
  // mini tabla materiales habituales
  miniHeader(ws, r, ['Material habitual', 'Cant/mes', 'Precio (Bs)', 'Principal']);
  r++;
  if (perfil.materiales_habituales.length === 0) {
    ws.getCell(r, 1).value = 'No registrados';
    r++;
  } else {
    for (const m of perfil.materiales_habituales) {
      ws.getCell(r, 1).value = m.material ?? '—';
      ws.getCell(r, 2).value = m.cantidad_mensual != null ? nfBO(m.cantidad_mensual) : '';
      ws.getCell(r, 3).value = m.precio_venta != null ? `Bs ${nfBO(m.precio_venta)}` : '';
      ws.getCell(r, 4).value = m.es_principal ? 'Sí' : '';
      r++;
    }
  }
  r++;

  seccion('Actividad real (lo que recolectó en el período)');
  dato('Entregas', nfBO(actividad.total.transacciones, 0));
  dato('Recolectado', `${nfBO(actividad.total.kg)} kg`);
  dato('CO₂ evitado', `${nfBO(actividad.total.co2_kg)} kg`);
  dato('Generado', `Bs ${nfBO(actividad.total.bs)}`);
  r++;

  if (actividad.por_material.length) {
    miniHeader(ws, r, ['Qué recolectó', 'Recolectado', 'Generado', '']);
    r++;
    for (const m of actividad.por_material) {
      ws.getCell(r, 1).value = m.material;
      ws.getCell(r, 2).value = `${nfBO(m.kg)} kg`;
      ws.getCell(r, 3).value = `Bs ${nfBO(m.bs)}`;
      r++;
    }
    r++;
  }

  if (actividad.transacciones.length) {
    miniHeader(ws, r, ['Fecha', 'Destino', 'Recolectado', 'Generado']);
    r++;
    for (const t of actividad.transacciones) {
      ws.getCell(r, 1).value = new Date(t.fecha).toLocaleDateString('es-BO', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      ws.getCell(r, 2).value = t.destino;
      ws.getCell(r, 3).value = `${nfBO(t.kg)} kg`;
      ws.getCell(r, 4).value = `Bs ${nfBO(t.bs)}`;
      r++;
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Excel "ficha" de UNA sucursal: datos + actividad real (total + desglose por
 * material + entregas). Es el informe que recibe el generador/colegio. No tiene
 * "perfil declarado" (sucursal_material casi no se usa). Sanea los textos libres.
 */
export async function construirExcelSucursal(opts: {
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
}): Promise<Buffer> {
  const { perfil, actividad } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Triple Impacto';
  wb.created = new Date();
  const ws = wb.addWorksheet('Ficha');
  ws.getColumn(1).width = 22;
  ws.getColumn(2).width = 28;
  ws.getColumn(3).width = 16;
  ws.getColumn(4).width = 16;

  let r = 1;
  const seccion = (titulo: string) => {
    ws.mergeCells(r, 1, r, 4);
    const c = ws.getCell(r, 1);
    c.value = titulo;
    c.font = { name: 'Calibri', bold: true, size: 12, color: { argb: TEAL } };
    r++;
  };
  const dato = (label: string, value: string) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { name: 'Calibri', color: { argb: 'FF666666' } };
    ws.mergeCells(r, 2, r, 4);
    ws.getCell(r, 2).value = sanearTexto(value) as ExcelJS.CellValue;
    r++;
  };

  // Título.
  ws.mergeCells(r, 1, r, 4);
  ws.getCell(r, 1).value = `Sucursal · ${perfil.nombre}`;
  ws.getCell(r, 1).font = { name: 'Calibri', bold: true, size: 14, color: { argb: TEAL } };
  r++;
  ws.mergeCells(r, 1, r, 4);
  ws.getCell(r, 1).value = `Período: ${opts.periodo.desde.slice(0, 10)} a ${opts.periodo.hasta.slice(0, 10)}`;
  ws.getCell(r, 1).font = { name: 'Calibri', size: 10, color: { argb: 'FF666666' } };
  r += 2;

  seccion('Datos');
  dato('Generador', perfil.generador);
  dato('Tipo', perfil.tipo_generador);
  dato('Dirección', perfil.direccion);
  dato('Zona', perfil.zona ?? '—');
  dato('Ciudad', perfil.ciudad ?? '—');
  dato('Departamento', perfil.departamento ?? '—');
  if (perfil.horario) dato('Horario', perfil.horario);
  r++;

  seccion('Actividad real (lo que recolectó en el período)');
  dato('Entregas', nfBO(actividad.total.transacciones, 0));
  dato('Recolectado', `${nfBO(actividad.total.kg)} kg`);
  dato('CO₂ evitado', `${nfBO(actividad.total.co2_kg)} kg`);
  dato('Generado', `Bs ${nfBO(actividad.total.bs)}`);
  r++;

  if (actividad.por_material.length) {
    miniHeader(ws, r, ['Qué recolectó', 'Recolectado', 'Generado', '']);
    r++;
    for (const m of actividad.por_material) {
      ws.getCell(r, 1).value = sanearTexto(m.material) as ExcelJS.CellValue;
      ws.getCell(r, 2).value = `${nfBO(m.kg)} kg`;
      ws.getCell(r, 3).value = `Bs ${nfBO(m.bs)}`;
      r++;
    }
    r++;
  }

  if (actividad.entregas.length) {
    miniHeader(ws, r, ['Fecha', 'Recolector', 'Recolectado', 'Generado']);
    r++;
    for (const e of actividad.entregas) {
      ws.getCell(r, 1).value = new Date(e.fecha).toLocaleDateString('es-BO', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      ws.getCell(r, 2).value = sanearTexto(e.recolector ?? '—') as ExcelJS.CellValue;
      ws.getCell(r, 3).value = `${nfBO(e.kg)} kg`;
      ws.getCell(r, 4).value = `Bs ${nfBO(e.bs)}`;
      r++;
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

/**
 * Excel "ficha" de UN generador: datos + actividad agregada de sus sucursales.
 * En CAPAS (igual que el PDF): KPIs + "Entregas" a nivel transacción (conteo
 * exacto) y "Resumen por sucursal" agregado aparte (con la nota de que una
 * entrega multi-sucursal cuenta en cada una). Números pre-formateados es-BO.
 */
export async function construirExcelGenerador(opts: {
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
}): Promise<Buffer> {
  const { perfil, actividad } = opts;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Triple Impacto';
  wb.created = new Date();
  const ws = wb.addWorksheet('Ficha');
  ws.getColumn(1).width = 26;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 14;
  ws.getColumn(4).width = 16;
  ws.getColumn(5).width = 16;
  ws.getColumn(6).width = 16;

  let r = 1;
  const seccion = (titulo: string) => {
    ws.mergeCells(r, 1, r, 6);
    const c = ws.getCell(r, 1);
    c.value = titulo;
    c.font = { name: 'Calibri', bold: true, size: 12, color: { argb: TEAL } };
    r++;
  };
  const dato = (label: string, value: string) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { name: 'Calibri', color: { argb: 'FF666666' } };
    ws.mergeCells(r, 2, r, 6);
    ws.getCell(r, 2).value = sanearTexto(value) as ExcelJS.CellValue;
    r++;
  };

  // Título.
  ws.mergeCells(r, 1, r, 6);
  ws.getCell(r, 1).value = `Generador · ${perfil.nombre}`;
  ws.getCell(r, 1).font = { name: 'Calibri', bold: true, size: 14, color: { argb: TEAL } };
  r++;
  ws.mergeCells(r, 1, r, 6);
  ws.getCell(r, 1).value = `Período: ${opts.periodo.desde.slice(0, 10)} a ${opts.periodo.hasta.slice(0, 10)}`;
  ws.getCell(r, 1).font = { name: 'Calibri', size: 10, color: { argb: 'FF666666' } };
  r += 2;

  seccion('Datos');
  dato('Tipo', perfil.tipo_generador ?? '—');
  dato(
    'Departamento(s)',
    perfil.departamentos.length ? perfil.departamentos.join(', ') : '—',
  );
  if (perfil.contacto_nombre) dato('Contacto', perfil.contacto_nombre);
  if (perfil.contacto_telefono) dato('Teléfono', perfil.contacto_telefono);
  if (perfil.contacto_email) dato('Email', perfil.contacto_email);
  r++;

  seccion('Actividad real (lo que aportaron sus sucursales en el período)');
  dato('Sucursales', nfBO(actividad.total.sucursales, 0));
  dato('Entregas', nfBO(actividad.total.transacciones, 0));
  dato('Recolectado', `${nfBO(actividad.total.kg)} kg`);
  dato('CO₂ evitado', `${nfBO(actividad.total.co2_kg)} kg`);
  dato('Generado', `Bs ${nfBO(actividad.total.bs)}`);
  r++;

  if (actividad.por_sucursal.length) {
    miniHeader(ws, r, ['Sucursal', 'Ciudad', 'Recolectado', 'Generado', '', '']);
    r++;
    for (const s of actividad.por_sucursal) {
      ws.getCell(r, 1).value = sanearTexto(s.sucursal) as ExcelJS.CellValue;
      ws.getCell(r, 2).value = sanearTexto(s.ciudad) as ExcelJS.CellValue;
      ws.getCell(r, 3).value = `${nfBO(s.kg)} kg`;
      ws.getCell(r, 4).value = `Bs ${nfBO(s.bs)}`;
      r++;
    }
    r++;
  }

  if (actividad.por_material.length) {
    miniHeader(ws, r, ['Material', 'Recolectado', 'Generado', '', '', '']);
    r++;
    for (const m of actividad.por_material) {
      ws.getCell(r, 1).value = sanearTexto(m.material) as ExcelJS.CellValue;
      ws.getCell(r, 2).value = `${nfBO(m.kg)} kg`;
      ws.getCell(r, 3).value = `Bs ${nfBO(m.bs)}`;
      r++;
    }
    r++;
  }

  if (actividad.entregas.length) {
    miniHeader(ws, r, [
      'Fecha',
      'Recolector',
      'Origen',
      'Recolectado',
      'Generado',
      '',
    ]);
    r++;
    for (const e of actividad.entregas) {
      ws.getCell(r, 1).value = new Date(e.fecha).toLocaleDateString('es-BO', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      ws.getCell(r, 2).value = sanearTexto(
        e.recolector ?? '—',
      ) as ExcelJS.CellValue;
      ws.getCell(r, 3).value = sanearTexto(
        e.sucursales_nombres ?? '—',
      ) as ExcelJS.CellValue;
      ws.getCell(r, 4).value = `${nfBO(e.kg)} kg`;
      ws.getCell(r, 5).value = `Bs ${nfBO(e.bs)}`;
      r++;
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function diaTitulo(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}
function miniHeader(
  ws: ExcelJS.Worksheet,
  row: number,
  headers: string[],
) {
  headers.forEach((h, i) => {
    if (!h) return;
    const c = ws.getCell(row, i + 1);
    c.value = h;
    c.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TEAL } };
  });
}
