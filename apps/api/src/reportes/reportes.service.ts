import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { ReporteQueryDto, ReporteRecolectorasQueryDto } from './dto';

// --- Tipos de fila por reporte (los CAST ::int/::float del SQL garantizan
//     que el driver pg devuelva números, no Decimal/BigInt). ---

type FilaAsociacion = {
  asociacion_id: number;
  asociacion: string;
  recolectoras: number;
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};
type FilaZona = {
  zona_id: number;
  zona: string;
  ciudad: string;
  recolectoras: number;
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};
type FilaDestino = {
  tipo_destino: string;
  destino: string;
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};
type FilaGenerador = {
  generador_id: number;
  generador: string;
  tipo_generador: string | null;
  sucursales: number;
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};
type FilaMaterial = {
  material_id: number;
  material: string;
  transacciones: number;
  kg: number;
  bs: number;
  co2_kg: number;
};
type FilaTipoGenerador = {
  tipo_generador_id: number;
  tipo_generador: string;
  generadores: number;
  transacciones: number;
  kg: number;
  bs: number;
  co2_kg: number;
};
type FilaMatriz = {
  material_id: number;
  material: string;
  tipo_generador_id: number;
  tipo_generador: string;
  kg: number;
  bs: number;
  co2_kg: number;
};
type TotalLinea = {
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};
/** Total "a nivel transacción" (recolectoras/transacciones distintas + sumas). */
type TotalTx = {
  recolectoras: number;
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};
/** Fila de la lista del reporte dinámico de recolectoras (perfil + actividad). */
type FilaRecolectora = {
  id: number;
  nombre: string;
  ci: string;
  edad: number;
  genero: string;
  trabaja_individual: boolean;
  zona: string;
  asociacion: string | null;
  entregas: number;
  kg: number;
  co2_kg: number;
  bs: number;
  ultima_entrega: Date | null;
};
type FilaDetalleMaterial = {
  material_id: number;
  material: string;
  kg: number;
  bs: number;
  co2_kg: number;
};
type FilaTransaccionDetalle = {
  transaccion_id: number;
  fecha: Date;
  estado: string;
  destino: string;
  kg: number;
  bs: number;
};

/**
 * Módulo de Reportes. A diferencia del dashboard (agrega EN MEMORIA recorriendo
 * arrays), los reportes agregan con SQL `GROUP BY` directamente en Postgres —
 * patrón performante (docs/25). Convenciones compartidas con el motor para que
 * los totales reconcilien: volumen = estados RECOLECTADO/ENTREGADO/PAGADO y solo
 * unidad KG; Bs = monto_total (1 vez por transacción); CO₂ = Σ cantidad·factor_co2;
 * scope por departamento activo del admin.
 */
@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Peso real (kg) de una línea de detalle según su unidad (alias `dt` para
   * detalle_transaccion, `m` para material):
   *   KG → cantidad · TONELADA → ×1000 · UNIDAD → cantidad × peso_unitario_kg.
   *   BOLSA y UNIDAD sin peso → 0 (no convertible).
   * Reemplaza al viejo `FILTER (WHERE dt.unidad_medida = 'KG')`, que descartaba
   * en silencio todo lo que no fuera KG (docs/34 §1). Debe declararse ANTES del
   * `txVolumenCte` porque este lo interpola (orden de inicialización de campos).
   */
  private readonly pesoKgSql = Prisma.sql`CASE dt.unidad_medida
        WHEN 'KG' THEN dt.cantidad
        WHEN 'TONELADA' THEN dt.cantidad * 1000
        WHEN 'UNIDAD' THEN dt.cantidad * COALESCE(m.peso_unitario_kg, 0)
        ELSE 0 END`;

  /**
   * CTE reutilizable (sin `WITH`, para poder componer varios CTEs): pre-agrega
   * kg y CO₂ por transacción. Evita el fan-out cartesiano al unir
   * transacción×detalle y sumar `monto_total` (docs/25).
   */
  private readonly txVolumenCte = Prisma.sql`
    tx_volumen AS (
      SELECT dt.transaccion_id,
             SUM(${this.pesoKgSql}) AS kg,
             SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)) AS co2
      FROM detalle_transaccion dt
      LEFT JOIN material m ON m.id = dt.material_id
      GROUP BY dt.transaccion_id
    )`;

  /** Estados que cuentan como material recolectado (alias `t`). */
  private readonly estados = Prisma.sql`t.estado IN ('RECOLECTADO', 'ENTREGADO', 'PAGADO')`;

  // ============================================================
  // Reportes a NIVEL TRANSACCIÓN (asociación, zona, destino)
  // ============================================================

  /** RF-05 §6: recolección por asociación (iniciativa) — dimensión que faltaba. */
  async porAsociacion(query: ReporteQueryDto, depto: number | null) {
    const { desde, hasta } = this.rango(query);
    const scope = this.scopeRecolector(depto);
    // Filtro multi-asociación ('Sin asociación' = bucket id 0).
    const filtroItems = query.asociacion_id?.length
      ? Prisma.sql`AND COALESCE(a.id, 0) IN (${Prisma.join(query.asociacion_id)})`
      : Prisma.empty;
    const filtroTotal = query.asociacion_id?.length
      ? Prisma.sql`AND COALESCE(r.asociacion_id, 0) IN (${Prisma.join(query.asociacion_id)})`
      : Prisma.empty;
    const items = await this.prisma.$queryRaw<FilaAsociacion[]>(Prisma.sql`
      WITH ${this.txVolumenCte}
      SELECT
        COALESCE(a.id, 0)::int                 AS asociacion_id,
        COALESCE(a.nombre, 'Sin asociación')   AS asociacion,
        COUNT(DISTINCT t.recolector_id)::int   AS recolectoras,
        COUNT(DISTINCT t.id)::int              AS transacciones,
        COALESCE(SUM(tv.kg), 0)::float         AS kg,
        COALESCE(SUM(tv.co2), 0)::float        AS co2_kg,
        COALESCE(SUM(t.monto_total), 0)::float AS bs
      FROM transaccion t
      JOIN recolector r ON r.id = t.recolector_id
      LEFT JOIN asociacion a ON a.id = r.asociacion_id
      LEFT JOIN tx_volumen tv ON tv.transaccion_id = t.id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${filtroItems}
      GROUP BY COALESCE(a.id, 0), COALESCE(a.nombre, 'Sin asociación')
      ORDER BY kg DESC
    `);
    return this.empaquetar(
      desde,
      hasta,
      await this.totalTx(desde, hasta, scope, filtroTotal),
      items,
    );
  }

  /** R-B4: recolección por zona/ciudad. */
  async porZona(query: ReporteQueryDto, depto: number | null) {
    const { desde, hasta } = this.rango(query);
    const scope = this.scopeRecolector(depto);
    // Filtro multi-zona (la zona es la de la transacción: t.zona_id).
    const filtro = query.zona_id?.length
      ? Prisma.sql`AND t.zona_id IN (${Prisma.join(query.zona_id)})`
      : Prisma.empty;
    const items = await this.prisma.$queryRaw<FilaZona[]>(Prisma.sql`
      WITH ${this.txVolumenCte}
      SELECT
        z.id::int                              AS zona_id,
        z.nombre                               AS zona,
        ci.nombre                              AS ciudad,
        COUNT(DISTINCT t.recolector_id)::int   AS recolectoras,
        COUNT(DISTINCT t.id)::int              AS transacciones,
        COALESCE(SUM(tv.kg), 0)::float         AS kg,
        COALESCE(SUM(tv.co2), 0)::float        AS co2_kg,
        COALESCE(SUM(t.monto_total), 0)::float AS bs
      FROM transaccion t
      JOIN recolector r ON r.id = t.recolector_id
      JOIN zona z ON z.id = t.zona_id
      JOIN ciudad ci ON ci.id = z.ciudad_id
      LEFT JOIN tx_volumen tv ON tv.transaccion_id = t.id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${filtro}
      GROUP BY z.id, z.nombre, ci.nombre
      ORDER BY kg DESC
    `);
    return this.empaquetar(
      desde,
      hasta,
      await this.totalTx(desde, hasta, scope, filtro),
      items,
    );
  }

  /** R-B9: recolección por destino (centro op / externo / desconocido). */
  async porDestino(query: ReporteQueryDto, depto: number | null) {
    const { desde, hasta } = this.rango(query);
    const scope = this.scopeRecolector(depto);
    // Filtro por categoría de destino (polimórfico). La misma expresión CASE
    // sirve para items y total (sólo referencia columnas de `t`).
    const tipoExpr = Prisma.sql`CASE
      WHEN t.centro_operacional_id IS NOT NULL THEN 'centro_op'
      WHEN t.acopiador_externo_id IS NOT NULL THEN 'externo'
      WHEN t.destino_desconocido THEN 'desconocido'
      ELSE 'sin_asignar' END`;
    const filtro = query.tipo_destino?.length
      ? Prisma.sql`AND (${tipoExpr}) IN (${Prisma.join(query.tipo_destino)})`
      : Prisma.empty;
    const items = await this.prisma.$queryRaw<FilaDestino[]>(Prisma.sql`
      WITH ${this.txVolumenCte}
      SELECT
        (${tipoExpr}) AS tipo_destino,
        COALESCE(co.nombre_punto, ext.nombre,
          CASE WHEN t.destino_desconocido THEN 'Desconocido' ELSE 'Sin asignar' END
        ) AS destino,
        COUNT(DISTINCT t.id)::int              AS transacciones,
        COALESCE(SUM(tv.kg), 0)::float         AS kg,
        COALESCE(SUM(tv.co2), 0)::float        AS co2_kg,
        COALESCE(SUM(t.monto_total), 0)::float AS bs
      FROM transaccion t
      JOIN recolector r ON r.id = t.recolector_id
      LEFT JOIN centro_operacional co ON co.id = t.centro_operacional_id
      LEFT JOIN acopiador_comprador_externo ext ON ext.id = t.acopiador_externo_id
      LEFT JOIN tx_volumen tv ON tv.transaccion_id = t.id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${filtro}
      GROUP BY 1, 2
      ORDER BY kg DESC
    `);
    return this.empaquetar(
      desde,
      hasta,
      await this.totalTx(desde, hasta, scope, filtro),
      items,
    );
  }

  // ============================================================
  // Reporte a NIVEL LÍNEA (generador) — usa subtotal por línea, no monto_total
  // ============================================================

  /**
   * R-E2 (pedido del cliente): cantidad generada por generador = suma de sus
   * sucursales. Es a NIVEL LÍNEA (cada detalle aporta a su sucursal→generador),
   * por eso el Bs es la suma de `subtotal` y NO `monto_total`. Excluye líneas
   * sin sucursal (material sin origen identificado) → su total puede ser menor
   * que el total global (caveat docs/25). Scope por el depto de la sucursal.
   */
  async porGenerador(query: ReporteQueryDto, depto: number | null) {
    const { desde, hasta } = this.rango(query);
    const scope =
      depto != null ? Prisma.sql`AND s.departamento_id = ${depto}` : Prisma.empty;
    // Filtro multi-generador (la sucursal apunta al generador: s.generador_id).
    const filtro = query.generador_id?.length
      ? Prisma.sql`AND s.generador_id IN (${Prisma.join(query.generador_id)})`
      : Prisma.empty;

    const items = await this.prisma.$queryRaw<FilaGenerador[]>(Prisma.sql`
      SELECT
        g.id::int                              AS generador_id,
        g.razon_social                         AS generador,
        tg.nombre                              AS tipo_generador,
        COUNT(DISTINCT s.id)::int              AS sucursales,
        COUNT(DISTINCT dt.transaccion_id)::int AS transacciones,
        COALESCE(SUM(${this.pesoKgSql}), 0)::float AS kg,
        COALESCE(SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)), 0)::float AS co2_kg,
        COALESCE(SUM(dt.subtotal), 0)::float   AS bs
      FROM detalle_transaccion dt
      JOIN transaccion t ON t.id = dt.transaccion_id
      JOIN sucursal s ON s.id = dt.sucursal_id
      JOIN generador g ON g.id = s.generador_id
      LEFT JOIN tipo_generador tg ON tg.id = g.tipo_generador_id
      LEFT JOIN material m ON m.id = dt.material_id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${filtro}
      GROUP BY g.id, g.razon_social, tg.nombre
      ORDER BY kg DESC
    `);

    const [total] = await this.prisma.$queryRaw<
      {
        generadores: number;
        sucursales: number;
        transacciones: number;
        kg: number;
        co2_kg: number;
        bs: number;
      }[]
    >(Prisma.sql`
      SELECT
        COUNT(DISTINCT g.id)::int              AS generadores,
        COUNT(DISTINCT s.id)::int              AS sucursales,
        COUNT(DISTINCT dt.transaccion_id)::int AS transacciones,
        COALESCE(SUM(${this.pesoKgSql}), 0)::float AS kg,
        COALESCE(SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)), 0)::float AS co2_kg,
        COALESCE(SUM(dt.subtotal), 0)::float   AS bs
      FROM detalle_transaccion dt
      JOIN transaccion t ON t.id = dt.transaccion_id
      JOIN sucursal s ON s.id = dt.sucursal_id
      JOIN generador g ON g.id = s.generador_id
      LEFT JOIN material m ON m.id = dt.material_id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${filtro}
    `);

    return {
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      total: this.redondearObj(total),
      items: items.map((i) => this.redondearObj(i)),
    };
  }

  // ============================================================
  // Más reportes: por material, por tipo de generador, matriz material×tipo
  // ============================================================

  /**
   * R-B2: volumen por material (incluye 'Otro' en bucket sintético id 0).
   * Nivel línea pero con scope por el departamento del recolector (igual que
   * los reportes a nivel transacción) → su total reconcilia con el global.
   * `bs` por material es la suma de `subtotal` (ingreso de ese material).
   */
  async porMaterial(query: ReporteQueryDto, depto: number | null) {
    const { desde, hasta } = this.rango(query);
    const scope = this.scopeRecolector(depto);
    // Filtro multi-material (a nivel línea). 'Otros' = bucket id 0.
    const matFiltro = query.material_id?.length
      ? Prisma.sql`AND COALESCE(m.id, 0) IN (${Prisma.join(query.material_id)})`
      : Prisma.empty;
    const items = await this.prisma.$queryRaw<FilaMaterial[]>(Prisma.sql`
      SELECT
        COALESCE(m.id, 0)::int                AS material_id,
        COALESCE(m.nombre, 'Otros (sin clasificar)') AS material,
        COUNT(DISTINCT t.id)::int             AS transacciones,
        COALESCE(SUM(${this.pesoKgSql}), 0)::float AS kg,
        COALESCE(SUM(dt.subtotal), 0)::float  AS bs,
        COALESCE(SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)), 0)::float AS co2_kg
      FROM detalle_transaccion dt
      JOIN transaccion t ON t.id = dt.transaccion_id
      JOIN recolector r ON r.id = t.recolector_id
      LEFT JOIN material m ON m.id = dt.material_id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${matFiltro}
      GROUP BY COALESCE(m.id, 0), COALESCE(m.nombre, 'Otros (sin clasificar)')
      ORDER BY kg DESC
    `);
    // Total: sin filtro usa el total tx-level (reconcilia con el global); con
    // filtro de material, total a nivel línea acotado a esos materiales para que
    // los KPIs y el % reflejen exactamente lo filtrado.
    const total = query.material_id?.length
      ? await this.totalMaterialFiltrado(desde, hasta, scope, matFiltro)
      : await this.totalTx(desde, hasta, scope);
    return {
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      total,
      items: items.map((i) => ({
        ...this.redondearObj(i),
        porcentaje: total.kg > 0 ? this.round((i.kg / total.kg) * 100) : 0,
      })),
    };
  }

  /**
   * R-B6: cantidades por tipo de generador (Bancos/Empresas/Colegios…). Nivel
   * línea; cada detalle aporta a su sucursal→generador→tipo. Scope por depto de
   * la sucursal. Excluye líneas sin sucursal → total < global (caveat docs/25).
   */
  async porTipoGenerador(query: ReporteQueryDto, depto: number | null) {
    const { desde, hasta } = this.rango(query);
    const scope =
      depto != null ? Prisma.sql`AND s.departamento_id = ${depto}` : Prisma.empty;
    // Filtro multi-tipo. En items `tg` está disponible; en el total (que sólo
    // une sucursal) se acota vía subconsulta sobre el generador de la sucursal.
    const filtroItems = query.tipo_generador_id?.length
      ? Prisma.sql`AND tg.id IN (${Prisma.join(query.tipo_generador_id)})`
      : Prisma.empty;
    const filtroTotal = query.tipo_generador_id?.length
      ? Prisma.sql`AND s.generador_id IN (SELECT g2.id FROM generador g2 WHERE g2.tipo_generador_id IN (${Prisma.join(query.tipo_generador_id)}))`
      : Prisma.empty;
    const items = await this.prisma.$queryRaw<FilaTipoGenerador[]>(Prisma.sql`
      SELECT
        tg.id::int                            AS tipo_generador_id,
        tg.nombre                             AS tipo_generador,
        COUNT(DISTINCT g.id)::int             AS generadores,
        COUNT(DISTINCT dt.transaccion_id)::int AS transacciones,
        COALESCE(SUM(${this.pesoKgSql}), 0)::float AS kg,
        COALESCE(SUM(dt.subtotal), 0)::float  AS bs,
        COALESCE(SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)), 0)::float AS co2_kg
      FROM detalle_transaccion dt
      JOIN transaccion t ON t.id = dt.transaccion_id
      JOIN sucursal s ON s.id = dt.sucursal_id
      JOIN generador g ON g.id = s.generador_id
      JOIN tipo_generador tg ON tg.id = g.tipo_generador_id
      LEFT JOIN material m ON m.id = dt.material_id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${filtroItems}
      GROUP BY tg.id, tg.nombre
      ORDER BY kg DESC
    `);
    return {
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      total: await this.totalLineaSucursal(desde, hasta, depto, filtroTotal),
      items: items.map((i) => this.redondearObj(i)),
    };
  }

  /**
   * R-B7: matriz material × tipo de generador (qué residuo viene de qué tipo de
   * fuente). Filas planas (material, tipo, kg, bs) que el front puede pivotar.
   * Nivel línea, scope por depto de la sucursal.
   */
  async porMaterialTipoGenerador(query: ReporteQueryDto, depto: number | null) {
    const { desde, hasta } = this.rango(query);
    const scope =
      depto != null ? Prisma.sql`AND s.departamento_id = ${depto}` : Prisma.empty;
    // Filtros combinables: material (m disponible en items y total) y tipo (en
    // items vía tg; en el total vía subconsulta sobre el generador).
    const condItems: Prisma.Sql[] = [];
    const condTotal: Prisma.Sql[] = [];
    if (query.material_id?.length) {
      const c = Prisma.sql`COALESCE(m.id, 0) IN (${Prisma.join(query.material_id)})`;
      condItems.push(c);
      condTotal.push(c);
    }
    if (query.tipo_generador_id?.length) {
      condItems.push(Prisma.sql`tg.id IN (${Prisma.join(query.tipo_generador_id)})`);
      condTotal.push(
        Prisma.sql`s.generador_id IN (SELECT g2.id FROM generador g2 WHERE g2.tipo_generador_id IN (${Prisma.join(query.tipo_generador_id)}))`,
      );
    }
    const filtroItems = condItems.length
      ? Prisma.sql`AND ${Prisma.join(condItems, ' AND ')}`
      : Prisma.empty;
    const filtroTotal = condTotal.length
      ? Prisma.sql`AND ${Prisma.join(condTotal, ' AND ')}`
      : Prisma.empty;
    const items = await this.prisma.$queryRaw<FilaMatriz[]>(Prisma.sql`
      SELECT
        COALESCE(m.id, 0)::int                AS material_id,
        COALESCE(m.nombre, 'Otros (sin clasificar)') AS material,
        tg.id::int                            AS tipo_generador_id,
        tg.nombre                             AS tipo_generador,
        COALESCE(SUM(${this.pesoKgSql}), 0)::float AS kg,
        COALESCE(SUM(dt.subtotal), 0)::float  AS bs,
        COALESCE(SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)), 0)::float AS co2_kg
      FROM detalle_transaccion dt
      JOIN transaccion t ON t.id = dt.transaccion_id
      JOIN sucursal s ON s.id = dt.sucursal_id
      JOIN generador g ON g.id = s.generador_id
      JOIN tipo_generador tg ON tg.id = g.tipo_generador_id
      LEFT JOIN material m ON m.id = dt.material_id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${filtroItems}
      GROUP BY COALESCE(m.id, 0), COALESCE(m.nombre, 'Otros (sin clasificar)'), tg.id, tg.nombre
      ORDER BY kg DESC
    `);
    return {
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      total: await this.totalLineaSucursal(desde, hasta, depto, filtroTotal),
      items: items.map((i) => this.redondearObj(i)),
    };
  }

  // ============================================================
  // Reporte DINÁMICO de recolectoras (lista + detalle perfil/actividad)
  // ============================================================

  /**
   * Lista filtrable de recolectoras con sus métricas de actividad del período.
   * Cruza el FILTRADO de perfil (recolector + recolector_material declarado, y
   * EXISTS sobre transacciones para "recolectó X de verdad") con la AGREGACIÓN
   * de actividad (CTE `actividad` por recolector). Las que no entregaron salen
   * con métricas en 0 (salvo que se pida `solo_activas`).
   *
   * Filtro de material DOBLE (decisión del cliente): `material_habitual`
   * (declarado, recolector_material) y `material_recolectado` (real, detalle).
   */
  async recolectoras(query: ReporteRecolectorasQueryDto, depto: number | null) {
    const { desde, hasta } = this.rango(query);

    const cond: Prisma.Sql[] = [];
    if (depto != null) cond.push(Prisma.sql`r.departamento_id = ${depto}`);
    // IDs explícitos (para "Exportar seleccionadas"): acota a estas personas.
    if (query.ids?.length)
      cond.push(Prisma.sql`r.id IN (${Prisma.join(query.ids)})`);
    if (query.genero) cond.push(Prisma.sql`r.genero::text = ${query.genero}`);
    if (query.trabaja_individual !== undefined)
      cond.push(Prisma.sql`r.trabaja_individual = ${query.trabaja_individual}`);
    if (query.zona_id?.length)
      cond.push(Prisma.sql`r.zona_id IN (${Prisma.join(query.zona_id)})`);
    if (query.asociacion_id?.length)
      cond.push(Prisma.sql`r.asociacion_id IN (${Prisma.join(query.asociacion_id)})`);
    if (query.edad_min != null) cond.push(Prisma.sql`r.edad >= ${query.edad_min}`);
    if (query.edad_max != null) cond.push(Prisma.sql`r.edad <= ${query.edad_max}`);
    if (query.search)
      cond.push(Prisma.sql`r.nombre_completo ILIKE ${'%' + query.search + '%'}`);
    if (query.material_habitual?.length)
      cond.push(Prisma.sql`EXISTS (
        SELECT 1 FROM recolector_material rm
        WHERE rm.recolector_id = r.id AND rm.material_id IN (${Prisma.join(query.material_habitual)}))`);
    if (query.material_recolectado?.length)
      cond.push(Prisma.sql`EXISTS (
        SELECT 1 FROM transaccion t2
        JOIN detalle_transaccion dt2 ON dt2.transaccion_id = t2.id
        WHERE t2.recolector_id = r.id
          AND t2.estado IN ('RECOLECTADO','ENTREGADO','PAGADO')
          AND t2.fecha BETWEEN ${desde} AND ${hasta}
          AND dt2.material_id IN (${Prisma.join(query.material_recolectado)}))`);
    if (query.solo_activas) cond.push(Prisma.sql`act.recolector_id IS NOT NULL`);

    const where = cond.length
      ? Prisma.sql`WHERE ${Prisma.join(cond, ' AND ')}`
      : Prisma.empty;

    const items = await this.prisma.$queryRaw<FilaRecolectora[]>(Prisma.sql`
      WITH ${this.txVolumenCte},
      actividad AS (
        SELECT t.recolector_id,
               COUNT(DISTINCT t.id) AS entregas,
               SUM(tv.kg) AS kg,
               SUM(tv.co2) AS co2,
               SUM(t.monto_total) AS bs,
               MAX(t.fecha) AS ultima_entrega
        FROM transaccion t
        JOIN tx_volumen tv ON tv.transaccion_id = t.id
        WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta}
        GROUP BY t.recolector_id
      )
      SELECT
        r.id::int                          AS id,
        r.nombre_completo                  AS nombre,
        r.cedula_identidad                 AS ci,
        r.edad::int                        AS edad,
        r.genero::text                     AS genero,
        r.trabaja_individual               AS trabaja_individual,
        z.nombre                           AS zona,
        a.nombre                           AS asociacion,
        COALESCE(act.entregas, 0)::int     AS entregas,
        COALESCE(act.kg, 0)::float         AS kg,
        COALESCE(act.co2, 0)::float        AS co2_kg,
        COALESCE(act.bs, 0)::float         AS bs,
        act.ultima_entrega                 AS ultima_entrega
      FROM recolector r
      JOIN zona z ON z.id = r.zona_id
      LEFT JOIN asociacion a ON a.id = r.asociacion_id
      LEFT JOIN actividad act ON act.recolector_id = r.id
      ${where}
      ORDER BY kg DESC NULLS LAST, r.nombre_completo
    `);

    // Total: cada fila es una recolectora ÚNICA, así que aquí sumar columnas es
    // correcto (a diferencia de los reportes por zona/destino).
    const total = {
      recolectoras: items.length,
      activas: items.filter((i) => i.entregas > 0).length,
      entregas: items.reduce((s, i) => s + i.entregas, 0),
      kg: this.round(items.reduce((s, i) => s + i.kg, 0)),
      co2_kg: this.round(items.reduce((s, i) => s + i.co2_kg, 0)),
      bs: this.round(items.reduce((s, i) => s + i.bs, 0)),
    };

    return {
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      total,
      items: items.map((i) => this.redondearObj(i)),
    };
  }

  /**
   * Detalle de UNA recolectora: combina el PERFIL declarado (qué recoge
   * normalmente, días, precios) con la ACTIVIDAD real del período (qué/cuánto
   * recolectó, ingresos, fechas) para poder comparar declarado vs real.
   * Scope por depto (IDOR): si la recolectora es de otro depto, 404.
   */
  async recolectoraDetalle(
    id: number,
    query: ReporteQueryDto,
    depto: number | null,
  ) {
    const { desde, hasta } = this.rango(query);

    const perfil = await this.prisma.recolector.findFirst({
      where: { id, ...(depto != null ? { departamento_id: depto } : {}) },
      select: {
        id: true,
        nombre_completo: true,
        cedula_identidad: true,
        celular: true,
        edad: true,
        genero: true,
        trabaja_individual: true,
        fecha_creacion: true,
        foto_url: true,
        zona: { select: { nombre: true } },
        asociacion: { select: { nombre: true } },
        departamento: { select: { nombre: true } },
        recolector_dia_trabajo: { select: { dia_semana: true } },
        recolector_material: {
          select: {
            cantidad_mensual: true,
            precio_venta: true,
            es_principal: true,
            nombre_personalizado: true,
            unidad_medida: true,
            material: { select: { id: true, nombre: true } },
          },
        },
        recolector_tipo_generador: {
          select: { tipo_generador: { select: { nombre: true } } },
        },
      },
    });
    if (!perfil) throw new NotFoundException('Recolectora no encontrada');

    // Actividad real total (reusa totalTx acotado a esta recolectora).
    const total = await this.totalTx(
      desde,
      hasta,
      Prisma.sql`AND t.recolector_id = ${id}`,
    );

    // Qué recolectó de verdad, por material.
    const porMaterial = await this.prisma.$queryRaw<FilaDetalleMaterial[]>(Prisma.sql`
      SELECT
        COALESCE(m.id, 0)::int                AS material_id,
        COALESCE(m.nombre, 'Otros (sin clasificar)') AS material,
        COALESCE(SUM(${this.pesoKgSql}), 0)::float AS kg,
        COALESCE(SUM(dt.subtotal), 0)::float  AS bs,
        COALESCE(SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)), 0)::float AS co2_kg
      FROM transaccion t
      JOIN detalle_transaccion dt ON dt.transaccion_id = t.id
      LEFT JOIN material m ON m.id = dt.material_id
      WHERE t.recolector_id = ${id} AND ${this.estados}
        AND t.fecha BETWEEN ${desde} AND ${hasta}
      GROUP BY COALESCE(m.id, 0), COALESCE(m.nombre, 'Otros (sin clasificar)')
      ORDER BY kg DESC
    `);

    // Lista de transacciones (las fechas) del período.
    const transacciones = await this.prisma.$queryRaw<FilaTransaccionDetalle[]>(Prisma.sql`
      WITH ${this.txVolumenCte}
      SELECT
        t.id::int          AS transaccion_id,
        t.fecha            AS fecha,
        t.estado::text     AS estado,
        COALESCE(co.nombre_punto, ext.nombre,
          CASE WHEN t.destino_desconocido THEN 'Desconocido' ELSE 'Sin asignar' END
        ) AS destino,
        COALESCE(tv.kg, 0)::float    AS kg,
        t.monto_total::float         AS bs
      FROM transaccion t
      LEFT JOIN centro_operacional co ON co.id = t.centro_operacional_id
      LEFT JOIN acopiador_comprador_externo ext ON ext.id = t.acopiador_externo_id
      LEFT JOIN tx_volumen tv ON tv.transaccion_id = t.id
      WHERE t.recolector_id = ${id} AND ${this.estados}
        AND t.fecha BETWEEN ${desde} AND ${hasta}
      ORDER BY t.fecha DESC
    `);

    return {
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      perfil: {
        id: perfil.id,
        nombre: perfil.nombre_completo,
        ci: perfil.cedula_identidad,
        celular: perfil.celular,
        edad: perfil.edad,
        genero: perfil.genero,
        trabaja_individual: perfil.trabaja_individual,
        foto_url: perfil.foto_url,
        zona: perfil.zona?.nombre ?? null,
        asociacion: perfil.asociacion?.nombre ?? null,
        departamento: perfil.departamento?.nombre ?? null,
        dias_trabajo: perfil.recolector_dia_trabajo.map((d) => d.dia_semana),
        // Lo DECLARADO: qué recoge normalmente.
        materiales_habituales: perfil.recolector_material.map((rm) => ({
          material: rm.material?.nombre ?? rm.nombre_personalizado,
          cantidad_mensual:
            rm.cantidad_mensual != null ? Number(rm.cantidad_mensual) : null,
          precio_venta: rm.precio_venta != null ? Number(rm.precio_venta) : null,
          es_principal: rm.es_principal,
        })),
        tipos_generador: perfil.recolector_tipo_generador.map(
          (tg) => tg.tipo_generador.nombre,
        ),
      },
      // Lo REAL: qué recolectó de verdad en el período.
      actividad: {
        total,
        por_material: porMaterial.map((m) => this.redondearObj(m)),
        transacciones: transacciones.map((t) => this.redondearObj(t)),
      },
    };
  }

  // ============================================================
  // Helpers compartidos
  // ============================================================

  /**
   * Total a nivel transacción (recolectoras/transacciones distintas + sumas).
   * `extra` permite acotar el total con el MISMO filtro de entidad que los items
   * (condición sobre `t`/`r`), para que los KPIs reflejen lo filtrado.
   */
  private async totalTx(
    desde: Date,
    hasta: Date,
    scope: Prisma.Sql,
    extra: Prisma.Sql = Prisma.empty,
  ): Promise<TotalTx> {
    const [total] = await this.prisma.$queryRaw<TotalTx[]>(Prisma.sql`
      WITH ${this.txVolumenCte}
      SELECT
        COUNT(DISTINCT t.recolector_id)::int   AS recolectoras,
        COUNT(DISTINCT t.id)::int              AS transacciones,
        COALESCE(SUM(tv.kg), 0)::float         AS kg,
        COALESCE(SUM(tv.co2), 0)::float        AS co2_kg,
        COALESCE(SUM(t.monto_total), 0)::float AS bs
      FROM transaccion t
      JOIN recolector r ON r.id = t.recolector_id
      LEFT JOIN tx_volumen tv ON tv.transaccion_id = t.id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${extra}
    `);
    return this.redondearObj(total);
  }

  /**
   * Total del reporte por-material CUANDO hay filtro de material: agrega a nivel
   * línea (mismos joins/scope que los items) acotando a los materiales elegidos.
   * Así kg/bs/CO₂ = suma de los materiales filtrados y recolectoras/transacciones
   * = distintas que recolectaron ALGUNO de esos materiales (reconcilia con la
   * suma de los items mostrados).
   */
  private async totalMaterialFiltrado(
    desde: Date,
    hasta: Date,
    scope: Prisma.Sql,
    matFiltro: Prisma.Sql,
  ): Promise<TotalTx> {
    const [total] = await this.prisma.$queryRaw<TotalTx[]>(Prisma.sql`
      SELECT
        COUNT(DISTINCT t.recolector_id)::int  AS recolectoras,
        COUNT(DISTINCT t.id)::int             AS transacciones,
        COALESCE(SUM(${this.pesoKgSql}), 0)::float AS kg,
        COALESCE(SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)), 0)::float AS co2_kg,
        COALESCE(SUM(dt.subtotal), 0)::float  AS bs
      FROM detalle_transaccion dt
      JOIN transaccion t ON t.id = dt.transaccion_id
      JOIN recolector r ON r.id = t.recolector_id
      LEFT JOIN material m ON m.id = dt.material_id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${matFiltro}
    `);
    return this.redondearObj(total);
  }

  /**
   * Total a NIVEL LÍNEA con scope por depto de la sucursal (para reportes que
   * agregan por sucursal/generador/tipo). Excluye líneas sin sucursal, así que
   * reconcilia con la suma de esos reportes, no con el total global.
   */
  private async totalLineaSucursal(
    desde: Date,
    hasta: Date,
    depto: number | null,
    extra: Prisma.Sql = Prisma.empty,
  ): Promise<TotalLinea> {
    const scope =
      depto != null ? Prisma.sql`AND s.departamento_id = ${depto}` : Prisma.empty;
    const [total] = await this.prisma.$queryRaw<TotalLinea[]>(Prisma.sql`
      SELECT
        COUNT(DISTINCT dt.transaccion_id)::int AS transacciones,
        COALESCE(SUM(${this.pesoKgSql}), 0)::float AS kg,
        COALESCE(SUM((${this.pesoKgSql}) * COALESCE(m.factor_co2, 0)), 0)::float AS co2_kg,
        COALESCE(SUM(dt.subtotal), 0)::float   AS bs
      FROM detalle_transaccion dt
      JOIN transaccion t ON t.id = dt.transaccion_id
      JOIN sucursal s ON s.id = dt.sucursal_id
      LEFT JOIN material m ON m.id = dt.material_id
      WHERE ${this.estados} AND t.fecha BETWEEN ${desde} AND ${hasta} ${scope} ${extra}
    `);
    return this.redondearObj(total);
  }

  private empaquetar<T extends Record<string, unknown>>(
    desde: Date,
    hasta: Date,
    total: TotalTx,
    items: T[],
  ) {
    return {
      rango: { desde: desde.toISOString(), hasta: hasta.toISOString() },
      total,
      items: items.map((i) => this.redondearObj(i)),
    };
  }

  /** Scope por departamento del recolector (reportes a nivel transacción). */
  private scopeRecolector(depto: number | null): Prisma.Sql {
    return depto != null
      ? Prisma.sql`AND r.departamento_id = ${depto}`
      : Prisma.empty;
  }

  /** Rango [desde, hasta]; default últimos 30 días (criterio de /estadisticas). */
  private rango(query: ReporteQueryDto): { desde: Date; hasta: Date } {
    const hasta = query.hasta
      ? this.finDia(query.hasta)
      : this.finDia(this.hoyKey());
    const desde = query.desde
      ? this.inicioDia(query.desde)
      : new Date(hasta.getTime() - 29 * 24 * 60 * 60 * 1000);
    return { desde, hasta };
  }

  private inicioDia(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  }
  private finDia(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
  }
  private hoyKey(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }

  /** Redondea a 2 decimales los campos numéricos float (kg/co2_kg/bs). */
  private redondearObj<T extends Record<string, unknown>>(obj: T): T {
    const out = { ...obj };
    for (const k of ['kg', 'co2_kg', 'bs'] as const) {
      if (typeof out[k] === 'number') {
        (out as Record<string, unknown>)[k] =
          Math.round((out[k] as number) * 100) / 100;
      }
    }
    return out;
  }
}
