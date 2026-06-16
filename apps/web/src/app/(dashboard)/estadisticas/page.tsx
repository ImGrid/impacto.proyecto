"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Users, Coins, Scale } from "lucide-react";
import { useEstadisticas } from "@/hooks/use-estadisticas";
import type { EstadisticasFilters } from "@/types/api";
import { KpiCard } from "../_components/kpi-card";
import { FiltrosBar } from "./_components/filtros-bar";
import { RankingChart } from "./_components/ranking-chart";
import { EvolucionDiariaChart } from "./_components/evolucion-diaria-chart";
import { TablaImpactoFinanciero } from "./_components/tabla-impacto-financiero";
import { TablaCo2Material } from "./_components/tabla-co2-material";
import { RecolectoraDetalleDialog } from "./_components/recolectora-detalle-dialog";

/**
 * Página analítica con filtros. A diferencia del dashboard, el usuario
 * controla el rango y puede hacer drill-down por zona, ciudad, material,
 * tipo de generador o tipo de destino.
 *
 * El detalle de UNA recolectora NO es un filtro: al hacer clic en su barra
 * del ranking o en su fila de la tabla se abre un modal de perfil
 * (drill-through), siguiendo el patrón "details-on-demand".
 */
export default function EstadisticasPage() {
  const [filters, setFilters] = useState<EstadisticasFilters>({});
  const { data, isLoading } = useEstadisticas(filters);

  // Drill-through: recolectora seleccionada para el drawer de perfil.
  const [recolectoraId, setRecolectoraId] = useState<number | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  function abrirRecolectora(id: number) {
    setRecolectoraId(id);
    setDetalleOpen(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Análisis completo con filtros por fecha, geografía, material,
          tipo de generador y destino. Sin filtros, se muestran los últimos
          30 días.
        </p>
      </div>

      <FiltrosBar value={filters} onChange={setFilters} />

      {/* KPIs del rango filtrado */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total recolectado"
          value={data?.kpis.total_recolectado_kg ?? 0}
          previous={data?.kpis.total_recolectado_kg_prev ?? 0}
          unit="kg"
          format="kg"
          icon={<Recycle />}
          loading={isLoading}
        />
        <KpiCard
          label="Total generado"
          value={data?.kpis.total_generado_bs ?? 0}
          previous={data?.kpis.total_generado_bs_prev ?? 0}
          unit="Bs"
          format="bs"
          icon={<Wallet />}
          loading={isLoading}
        />
        <KpiCard
          label="CO₂ evitado"
          value={data?.kpis.co2_evitado_kg ?? 0}
          previous={data?.kpis.co2_evitado_kg_prev ?? 0}
          unit="kg"
          format="kg"
          icon={<Leaf />}
          loading={isLoading}
        />
        <KpiCard
          label="Recolectoras activas"
          value={data?.kpis.recolectoras_activas ?? 0}
          previous={data?.kpis.recolectoras_activas_prev ?? 0}
          format="int"
          icon={<Users />}
          loading={isLoading}
        />
      </div>

      {/* Aviso: recolecciones sin precio. Cuentan en kg/CO₂ pero no en Bs, por
          eso el volumen puede ser mayor que lo generado en Bs. */}
      {data && data.pendientes_precio_count > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/30 dark:text-violet-300">
          <Coins className="h-5 w-5 shrink-0" />
          <span>
            {data.pendientes_precio_count}{" "}
            {data.pendientes_precio_count === 1
              ? "recolección del período no tiene precio"
              : "recolecciones del período no tienen precio"}
            . Cuentan en los kilos y el CO₂, pero no en los ingresos (Bs) hasta
            que se les asigne un precio.
          </span>
        </div>
      )}

      {/* Aviso: líneas en unidad sin peso definido. No se pueden convertir a
          kg, así que no cuentan en el volumen ni el CO₂ hasta cargar el peso. */}
      {data && data.lineas_sin_peso_count > 0 && (
        <div className="flex items-center gap-3 rounded-md border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
          <Scale className="h-5 w-5 shrink-0" />
          <span>
            {data.lineas_sin_peso_count}{" "}
            {data.lineas_sin_peso_count === 1
              ? "registro del período es de un material por unidad sin peso definido"
              : "registros del período son de materiales por unidad sin peso definido"}
            . No cuentan en los kilos ni el CO₂ hasta que se defina el peso del
            material.
          </span>
        </div>
      )}

      {/* Evolución diaria */}
      {data && <EvolucionDiariaChart items={data.evolucion_diaria} />}

      {/* Rankings barra horizontal */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RankingChart
            title="Por recolectora"
            description="Kilos recolectados en el rango — clic para ver el perfil"
            items={data.por_recolectora.map((r) => ({
              id: r.id,
              label: r.nombre,
              kg: r.kg,
            }))}
            onItemClick={abrirRecolectora}
          />
          <RankingChart
            title="Por sucursal"
            description="Kilos que vinieron de cada sucursal"
            items={data.por_sucursal.map((s) => ({
              id: s.id,
              label: `${s.generador} — ${s.nombre}`,
              kg: s.kg,
            }))}
          />
        </div>
      )}

      {/* Ranking por tipo de generador (excluye material sin origen
          identificado, que no tiene generador asociado). */}
      {data && (
        <RankingChart
          title="Por tipo de generador"
          description="Kilos recolectados según el tipo de fuente generadora"
          items={data.por_tipo_generador.map((t) => ({
            id: t.id,
            label: t.nombre,
            kg: t.kg,
          }))}
          emptyLabel="Sin datos con origen identificado en el rango"
        />
      )}

      {/* Tablas detalladas */}
      {data && (
        <>
          <TablaImpactoFinanciero
            items={data.por_recolectora}
            onRecolectoraClick={abrirRecolectora}
          />
          <TablaCo2Material items={data.por_material} />
        </>
      )}

      {/* Modal de perfil de recolectora (drill-through) */}
      <RecolectoraDetalleDialog
        recolectoraId={recolectoraId}
        open={detalleOpen}
        onOpenChange={setDetalleOpen}
        filters={filters}
      />
    </div>
  );
}
