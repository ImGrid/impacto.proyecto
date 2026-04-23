import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma';
import { EstadisticasQueryDto } from './dto';

/**
 * Datos agregados del dashboard administrativo.
 *
 * La vista es "operational": muestra lo que está pasando en el mes
 * actual y alertas accionables. Las series comparativas son mes actual
 * vs mes anterior completo (el Excel del cliente usa esa misma unidad).
 *
 * Fórmula CO₂ tomada del Excel del cliente (hoja POR MATERIAL):
 *   co2_evitado = Σ (cantidad_kg × factor_co2)
 *
 * La unidad resultante se nombra "kg" para coincidir con la etiqueta
 * del Excel, aunque estrictamente sean g de CO₂e. Mantener la misma
 * convención evita confundir al cliente que ya interpreta el dato.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const { mesActualDesde, mesActualHasta, mesPrevDesde, mesPrevHasta } =
      this.rangosMes(now);

    // 6 meses incluyendo el actual (de más antiguo a más nuevo)
    const seisMesesDesde = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      transMesActual,
      transMesPrev,
      transSeisMeses,
      pendientesPago,
      pendientesVerif,
    ] = await Promise.all([
      // Entregas del mes actual: solo las que ya tienen precio (ENTREGADO/PAGADO).
      this.prisma.transaccion.findMany({
        where: {
          estado: { in: ['ENTREGADO', 'PAGADO'] },
          fecha: { gte: mesActualDesde, lte: mesActualHasta },
        },
        include: this.transaccionDashboardInclude(),
      }),
      // Mes anterior: mismo filtro.
      this.prisma.transaccion.findMany({
        where: {
          estado: { in: ['ENTREGADO', 'PAGADO'] },
          fecha: { gte: mesPrevDesde, lte: mesPrevHasta },
        },
        include: this.transaccionDashboardInclude(),
      }),
      // Serie 6 meses: todas las ENTREGADO/PAGADO.
      this.prisma.transaccion.findMany({
        where: {
          estado: { in: ['ENTREGADO', 'PAGADO'] },
          fecha: { gte: seisMesesDesde, lte: mesActualHasta },
        },
        include: {
          detalle_transaccion: {
            select: { cantidad: true, unidad_medida: true },
          },
        },
      }),
      // Entregas ENTREGADO sin pago vinculado: deuda pendiente.
      this.prisma.transaccion.findMany({
        where: {
          estado: 'ENTREGADO',
          pago_transaccion: null,
        },
        select: { id: true, monto_total: true },
      }),
      // Entregas RECOLECTADO: esperando que el acopiador verifique.
      this.prisma.transaccion.count({
        where: { estado: 'RECOLECTADO' },
      }),
    ]);

    const kpisActual = this.calcularKpis(transMesActual);
    const kpisPrev = this.calcularKpis(transMesPrev);

    return {
      kpis: {
        total_recolectado_kg: kpisActual.kg,
        total_recolectado_kg_prev: kpisPrev.kg,
        total_generado_bs: kpisActual.bs,
        total_generado_bs_prev: kpisPrev.bs,
        co2_evitado_kg: kpisActual.co2,
        co2_evitado_kg_prev: kpisPrev.co2,
        recolectoras_activas: kpisActual.recolectoras,
        recolectoras_activas_prev: kpisPrev.recolectoras,
      },
      alertas: {
        pendientes_pago_count: pendientesPago.length,
        pendientes_pago_monto: pendientesPago.reduce(
          (s, t) => s + Number(t.monto_total),
          0,
        ),
        pendientes_verificacion_count: pendientesVerif,
      },
      evolucion_mensual: this.evolucionMensual(transSeisMeses, now),
      distribucion_material: this.distribucionMaterial(transMesActual),
      top_recolectoras: this.topRecolectoras(transMesActual, 3),
      top_sucursales: this.topSucursales(transMesActual, 3),
    };
  }

  // --- Helpers ---

  private transaccionDashboardInclude() {
    return {
      detalle_transaccion: {
        include: {
          material: {
            select: { id: true, nombre: true, factor_co2: true },
          },
        },
      },
      recolector: {
        select: { id: true, nombre_completo: true },
      },
      sucursal: {
        select: {
          id: true,
          nombre: true,
          generador: { select: { razon_social: true } },
        },
      },
    } satisfies Prisma.transaccionInclude;
  }

  /** Rango [desde, hasta] para el mes en curso y el mes anterior. */
  private rangosMes(now: Date) {
    const y = now.getFullYear();
    const m = now.getMonth();
    const mesActualDesde = new Date(y, m, 1, 0, 0, 0);
    const mesActualHasta = new Date(y, m + 1, 0, 23, 59, 59, 999);
    const mesPrevDesde = new Date(y, m - 1, 1, 0, 0, 0);
    const mesPrevHasta = new Date(y, m, 0, 23, 59, 59, 999);
    return { mesActualDesde, mesActualHasta, mesPrevDesde, mesPrevHasta };
  }

  /**
   * Calcula los 4 KPIs sobre una lista de transacciones.
   * Solo suma detalles con unidad KG para evitar mezclar bolsas/unidades
   * con kg en el mismo indicador.
   */
  private calcularKpis(
    transacciones: Array<{
      recolector_id: number | null;
      monto_total: Prisma.Decimal;
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
        material_id?: number;
        material: { factor_co2: Prisma.Decimal | null };
      }>;
    }>,
    materialFiltro?: number,
  ) {
    let kg = 0;
    let co2 = 0;
    let bs = 0;
    const recolectoresSet = new Set<number>();

    for (const t of transacciones) {
      // Bs siempre se suma entero (no es "por material"): es el monto
      // total que el acopiador pagó por la entrega, sin desglose.
      bs += Number(t.monto_total);
      if (t.recolector_id != null) recolectoresSet.add(t.recolector_id);
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida !== 'KG') continue;
        if (materialFiltro && d.material_id !== materialFiltro) continue;
        const cantidad = Number(d.cantidad);
        kg += cantidad;
        const factor = d.material.factor_co2
          ? Number(d.material.factor_co2)
          : 0;
        co2 += cantidad * factor;
      }
    }

    return {
      kg: this.round(kg, 2),
      co2: this.round(co2, 2),
      bs: this.round(bs, 2),
      recolectoras: recolectoresSet.size,
    };
  }

  /**
   * Serie de 6 meses (del más antiguo al actual). Cada punto suma kg
   * y Bs del mes completo, aunque ese mes tenga 0 transacciones.
   */
  private evolucionMensual(
    transacciones: Array<{
      fecha: Date;
      monto_total: Prisma.Decimal;
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
      }>;
    }>,
    now: Date,
  ) {
    const meses: { mes: string; kg: number; bs: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      meses.push({ mes: mesKey, kg: 0, bs: 0 });
    }
    const idx = new Map(meses.map((m, i) => [m.mes, i]));

    for (const t of transacciones) {
      const d = new Date(t.fecha);
      const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const pos = idx.get(mesKey);
      if (pos == null) continue;
      meses[pos].bs += Number(t.monto_total);
      for (const det of t.detalle_transaccion) {
        if (det.unidad_medida === 'KG') {
          meses[pos].kg += Number(det.cantidad);
        }
      }
    }

    return meses.map((m) => ({
      mes: m.mes,
      kg: this.round(m.kg, 2),
      bs: this.round(m.bs, 2),
    }));
  }

  /** Distribución por material: kg y % del total (solo unidad KG). */
  private distribucionMaterial(
    transacciones: Array<{
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
        material: { id: number; nombre: string };
      }>;
    }>,
  ) {
    const map = new Map<number, { id: number; nombre: string; kg: number }>();
    let total = 0;
    for (const t of transacciones) {
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida !== 'KG') continue;
        const cantidad = Number(d.cantidad);
        total += cantidad;
        const prev = map.get(d.material.id);
        if (prev) {
          prev.kg += cantidad;
        } else {
          map.set(d.material.id, {
            id: d.material.id,
            nombre: d.material.nombre,
            kg: cantidad,
          });
        }
      }
    }
    return Array.from(map.values())
      .map((m) => ({
        id: m.id,
        nombre: m.nombre,
        kg: this.round(m.kg, 2),
        porcentaje: total > 0 ? this.round((m.kg / total) * 100, 1) : 0,
      }))
      .sort((a, b) => b.kg - a.kg);
  }

  private topRecolectoras(
    transacciones: Array<{
      recolector_id: number | null;
      recolector: { id: number; nombre_completo: string } | null;
      monto_total: Prisma.Decimal;
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
      }>;
    }>,
    limit: number,
  ) {
    const map = new Map<
      number,
      { id: number; nombre: string; kg: number; bs: number }
    >();
    for (const t of transacciones) {
      if (!t.recolector) continue;
      const acc = map.get(t.recolector.id) ?? {
        id: t.recolector.id,
        nombre: t.recolector.nombre_completo,
        kg: 0,
        bs: 0,
      };
      acc.bs += Number(t.monto_total);
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida === 'KG') acc.kg += Number(d.cantidad);
      }
      map.set(t.recolector.id, acc);
    }
    return Array.from(map.values())
      .map((x) => ({ ...x, kg: this.round(x.kg, 2), bs: this.round(x.bs, 2) }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, limit);
  }

  private topSucursales(
    transacciones: Array<{
      sucursal: {
        id: number;
        nombre: string;
        generador: { razon_social: string };
      } | null;
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
      }>;
    }>,
    limit: number,
  ) {
    const map = new Map<
      number,
      { id: number; nombre: string; generador: string; kg: number }
    >();
    for (const t of transacciones) {
      if (!t.sucursal) continue;
      const acc = map.get(t.sucursal.id) ?? {
        id: t.sucursal.id,
        nombre: t.sucursal.nombre,
        generador: t.sucursal.generador.razon_social,
        kg: 0,
      };
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida === 'KG') acc.kg += Number(d.cantidad);
      }
      map.set(t.sucursal.id, acc);
    }
    return Array.from(map.values())
      .map((x) => ({ ...x, kg: this.round(x.kg, 2) }))
      .sort((a, b) => b.kg - a.kg)
      .slice(0, limit);
  }

  private round(n: number, decimals: number) {
    const f = 10 ** decimals;
    return Math.round(n * f) / f;
  }

  // ============================================================
  // ESTADÍSTICAS (vista analítica con filtros)
  // ============================================================

  /**
   * Agregaciones para la página /estadisticas. A diferencia del dashboard,
   * acepta un rango arbitrario y filtros por zona y material. El período
   * previo para el cálculo del delta se calcula como "el mismo largo
   * inmediatamente anterior" — ej: si el rango es 1-30 abr (30 días), el
   * previo es 2-31 mar. Esto es más útil que "mes anterior" cuando el
   * usuario elige cualquier rango.
   */
  async getEstadisticas(query: EstadisticasQueryDto) {
    // Defaults: últimos 30 días terminando hoy.
    const hoy = new Date();
    const hasta = query.hasta
      ? this.parseFechaFin(query.hasta)
      : new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59, 999);
    const desde = query.desde
      ? this.parseFechaInicio(query.desde)
      : new Date(hasta.getTime() - 29 * 24 * 60 * 60 * 1000);

    // Validación básica: desde <= hasta.
    if (desde > hasta) {
      return this.emptyEstadisticas(desde, hasta);
    }

    // Período previo: mismo largo, inmediatamente antes.
    const duracionMs = hasta.getTime() - desde.getTime();
    const prevHasta = new Date(desde.getTime() - 1);
    const prevDesde = new Date(prevHasta.getTime() - duracionMs);

    const whereBase: Prisma.transaccionWhereInput = {
      estado: { in: ['ENTREGADO', 'PAGADO'] },
    };
    if (query.zona_id) whereBase.zona_id = query.zona_id;

    // Si hay filtro por material, filtramos por detalle también.
    const detalleFiltro = query.material_id
      ? { some: { material_id: query.material_id } }
      : undefined;

    const [transActual, transPrev] = await Promise.all([
      this.prisma.transaccion.findMany({
        where: {
          ...whereBase,
          fecha: { gte: desde, lte: hasta },
          ...(detalleFiltro ? { detalle_transaccion: detalleFiltro } : {}),
        },
        include: this.transaccionEstadisticasInclude(),
      }),
      this.prisma.transaccion.findMany({
        where: {
          ...whereBase,
          fecha: { gte: prevDesde, lte: prevHasta },
          ...(detalleFiltro ? { detalle_transaccion: detalleFiltro } : {}),
        },
        include: {
          detalle_transaccion: {
            select: {
              cantidad: true,
              unidad_medida: true,
              material_id: true,
              material: { select: { factor_co2: true } },
            },
          },
        } satisfies Prisma.transaccionInclude,
      }),
    ]);

    const kpisActual = this.calcularKpis(transActual, query.material_id);
    const kpisPrev = this.calcularKpis(transPrev, query.material_id);

    return {
      rango: {
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        prev_desde: prevDesde.toISOString(),
        prev_hasta: prevHasta.toISOString(),
      },
      kpis: {
        total_recolectado_kg: kpisActual.kg,
        total_recolectado_kg_prev: kpisPrev.kg,
        total_generado_bs: kpisActual.bs,
        total_generado_bs_prev: kpisPrev.bs,
        co2_evitado_kg: kpisActual.co2,
        co2_evitado_kg_prev: kpisPrev.co2,
        recolectoras_activas: kpisActual.recolectoras,
        recolectoras_activas_prev: kpisPrev.recolectoras,
      },
      por_recolectora: this.rankingRecolectoras(transActual, query.material_id),
      por_sucursal: this.rankingSucursales(transActual, query.material_id),
      por_material: this.rankingMateriales(transActual, query.material_id),
      evolucion_diaria: this.evolucionDiaria(
        transActual,
        desde,
        hasta,
        query.material_id,
      ),
    };
  }

  private transaccionEstadisticasInclude() {
    return {
      detalle_transaccion: {
        include: {
          material: {
            select: { id: true, nombre: true, factor_co2: true },
          },
        },
      },
      recolector: {
        select: { id: true, nombre_completo: true, cedula_identidad: true },
      },
      sucursal: {
        select: {
          id: true,
          nombre: true,
          generador: { select: { razon_social: true } },
        },
      },
    } satisfies Prisma.transaccionInclude;
  }

  /** "2026-04-01" → 2026-04-01 00:00:00 local. */
  private parseFechaInicio(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0);
  }

  /** "2026-04-30" → 2026-04-30 23:59:59.999 local. */
  private parseFechaFin(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1, 23, 59, 59, 999);
  }

  private emptyEstadisticas(desde: Date, hasta: Date) {
    return {
      rango: {
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        prev_desde: desde.toISOString(),
        prev_hasta: hasta.toISOString(),
      },
      kpis: {
        total_recolectado_kg: 0,
        total_recolectado_kg_prev: 0,
        total_generado_bs: 0,
        total_generado_bs_prev: 0,
        co2_evitado_kg: 0,
        co2_evitado_kg_prev: 0,
        recolectoras_activas: 0,
        recolectoras_activas_prev: 0,
      },
      por_recolectora: [],
      por_sucursal: [],
      por_material: [],
      evolucion_diaria: [],
    };
  }

  /**
   * Ranking completo de recolectoras del período. Agrega Bs total y kg.
   * Si se pasó `material_id` como filtro, la cantidad solo cuenta detalles
   * de ese material (coherente con lo que el usuario espera al filtrar).
   */
  private rankingRecolectoras(
    transacciones: Array<{
      recolector: {
        id: number;
        nombre_completo: string;
        cedula_identidad: string;
      } | null;
      monto_total: Prisma.Decimal;
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
        material_id: number;
        material: { factor_co2: Prisma.Decimal | null };
      }>;
    }>,
    materialFiltro?: number,
  ) {
    const map = new Map<
      number,
      {
        id: number;
        nombre: string;
        ci: string;
        kg: number;
        bs: number;
        co2_kg: number;
      }
    >();

    for (const t of transacciones) {
      if (!t.recolector) continue;
      const acc = map.get(t.recolector.id) ?? {
        id: t.recolector.id,
        nombre: t.recolector.nombre_completo,
        ci: t.recolector.cedula_identidad,
        kg: 0,
        bs: 0,
        co2_kg: 0,
      };
      acc.bs += Number(t.monto_total);
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida !== 'KG') continue;
        if (materialFiltro && d.material_id !== materialFiltro) continue;
        const q = Number(d.cantidad);
        acc.kg += q;
        if (d.material.factor_co2) {
          acc.co2_kg += q * Number(d.material.factor_co2);
        }
      }
      map.set(t.recolector.id, acc);
    }

    return Array.from(map.values())
      .map((x) => ({
        ...x,
        kg: this.round(x.kg, 2),
        bs: this.round(x.bs, 2),
        co2_kg: this.round(x.co2_kg, 2),
      }))
      .sort((a, b) => b.kg - a.kg);
  }

  /** Ranking completo de sucursales del período. */
  private rankingSucursales(
    transacciones: Array<{
      sucursal: {
        id: number;
        nombre: string;
        generador: { razon_social: string };
      } | null;
      monto_total: Prisma.Decimal;
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
        material_id: number;
      }>;
    }>,
    materialFiltro?: number,
  ) {
    const map = new Map<
      number,
      {
        id: number;
        nombre: string;
        generador: string;
        kg: number;
        bs: number;
      }
    >();
    for (const t of transacciones) {
      if (!t.sucursal) continue;
      const acc = map.get(t.sucursal.id) ?? {
        id: t.sucursal.id,
        nombre: t.sucursal.nombre,
        generador: t.sucursal.generador.razon_social,
        kg: 0,
        bs: 0,
      };
      acc.bs += Number(t.monto_total);
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida !== 'KG') continue;
        if (materialFiltro && d.material_id !== materialFiltro) continue;
        acc.kg += Number(d.cantidad);
      }
      map.set(t.sucursal.id, acc);
    }
    return Array.from(map.values())
      .map((x) => ({ ...x, kg: this.round(x.kg, 2), bs: this.round(x.bs, 2) }))
      .sort((a, b) => b.kg - a.kg);
  }

  /**
   * Ranking de materiales con CO₂ evitado (igual al Excel del cliente).
   * Incluye factor_co2 para que el frontend pueda mostrarlo en la tabla.
   */
  private rankingMateriales(
    transacciones: Array<{
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
        material: {
          id: number;
          nombre: string;
          factor_co2: Prisma.Decimal | null;
        };
      }>;
    }>,
    materialFiltro?: number,
  ) {
    const map = new Map<
      number,
      {
        id: number;
        nombre: string;
        factor_co2: number | null;
        kg: number;
        co2_evitado_kg: number;
      }
    >();
    let total = 0;
    for (const t of transacciones) {
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida !== 'KG') continue;
        if (materialFiltro && d.material.id !== materialFiltro) continue;
        const q = Number(d.cantidad);
        total += q;
        const prev = map.get(d.material.id);
        const factor = d.material.factor_co2 ? Number(d.material.factor_co2) : null;
        if (prev) {
          prev.kg += q;
          if (factor != null) prev.co2_evitado_kg += q * factor;
        } else {
          map.set(d.material.id, {
            id: d.material.id,
            nombre: d.material.nombre,
            factor_co2: factor,
            kg: q,
            co2_evitado_kg: factor != null ? q * factor : 0,
          });
        }
      }
    }
    return Array.from(map.values())
      .map((m) => ({
        ...m,
        kg: this.round(m.kg, 2),
        co2_evitado_kg: this.round(m.co2_evitado_kg, 2),
        porcentaje: total > 0 ? this.round((m.kg / total) * 100, 1) : 0,
      }))
      .sort((a, b) => b.kg - a.kg);
  }

  /**
   * Serie diaria del período. Cada día del rango aparece — los días sin
   * datos en la BD salen en 0 para que el gráfico no tenga "huecos".
   */
  private evolucionDiaria(
    transacciones: Array<{
      fecha: Date;
      monto_total: Prisma.Decimal;
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
        material_id: number;
      }>;
    }>,
    desde: Date,
    hasta: Date,
    materialFiltro?: number,
  ) {
    const diffMs = 24 * 60 * 60 * 1000;
    const dias: { fecha: string; kg: number; bs: number }[] = [];
    const idx = new Map<string, number>();

    // Límite suave para no explotar el array en rangos largos.
    // Si el rango es > 366 días, devolvemos por semana en lugar de por día.
    const totalDias = Math.ceil((hasta.getTime() - desde.getTime()) / diffMs) + 1;
    if (totalDias > 366) {
      return this.evolucionSemanal(transacciones, desde, hasta, materialFiltro);
    }

    const cursor = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
    const fin = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
    while (cursor <= fin) {
      const key = this.fechaKey(cursor);
      idx.set(key, dias.length);
      dias.push({ fecha: key, kg: 0, bs: 0 });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const t of transacciones) {
      const key = this.fechaKey(new Date(t.fecha));
      const pos = idx.get(key);
      if (pos == null) continue;
      dias[pos].bs += Number(t.monto_total);
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida !== 'KG') continue;
        if (materialFiltro && d.material_id !== materialFiltro) continue;
        dias[pos].kg += Number(d.cantidad);
      }
    }
    return dias.map((d) => ({
      fecha: d.fecha,
      kg: this.round(d.kg, 2),
      bs: this.round(d.bs, 2),
    }));
  }

  private evolucionSemanal(
    transacciones: Array<{
      fecha: Date;
      monto_total: Prisma.Decimal;
      detalle_transaccion: Array<{
        cantidad: Prisma.Decimal;
        unidad_medida: string;
        material_id: number;
      }>;
    }>,
    desde: Date,
    hasta: Date,
    materialFiltro?: number,
  ) {
    // Agrupa por lunes de cada semana.
    const semanas: { fecha: string; kg: number; bs: number }[] = [];
    const idx = new Map<string, number>();
    const getLunesKey = (d: Date) => {
      const dow = d.getDay() || 7; // 1..7 con domingo=7
      const lunes = new Date(d);
      lunes.setDate(d.getDate() - (dow - 1));
      lunes.setHours(0, 0, 0, 0);
      return this.fechaKey(lunes);
    };

    const cursor = new Date(desde);
    cursor.setHours(0, 0, 0, 0);
    while (cursor <= hasta) {
      const key = getLunesKey(cursor);
      if (!idx.has(key)) {
        idx.set(key, semanas.length);
        semanas.push({ fecha: key, kg: 0, bs: 0 });
      }
      cursor.setDate(cursor.getDate() + 7);
    }

    for (const t of transacciones) {
      const key = getLunesKey(new Date(t.fecha));
      const pos = idx.get(key);
      if (pos == null) continue;
      semanas[pos].bs += Number(t.monto_total);
      for (const d of t.detalle_transaccion) {
        if (d.unidad_medida !== 'KG') continue;
        if (materialFiltro && d.material_id !== materialFiltro) continue;
        semanas[pos].kg += Number(d.cantidad);
      }
    }
    return semanas.map((d) => ({
      fecha: d.fecha,
      kg: this.round(d.kg, 2),
      bs: this.round(d.bs, 2),
    }));
  }

  private fechaKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
