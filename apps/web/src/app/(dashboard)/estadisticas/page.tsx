"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Users } from "lucide-react";
import { useEstadisticas } from "@/hooks/use-estadisticas";
import type { EstadisticasFilters } from "@/types/api";
import { KpiCard } from "../_components/kpi-card";
import { FiltrosBar } from "./_components/filtros-bar";
import { RankingChart } from "./_components/ranking-chart";
import { EvolucionDiariaChart } from "./_components/evolucion-diaria-chart";
import { TablaImpactoFinanciero } from "./_components/tabla-impacto-financiero";
import { TablaCo2Material } from "./_components/tabla-co2-material";

/**
 * Página analítica con filtros. A diferencia del dashboard, el usuario
 * controla el rango y puede hacer drill-down por zona o material.
 */
export default function EstadisticasPage() {
  const [filters, setFilters] = useState<EstadisticasFilters>({});
  const { data, isLoading } = useEstadisticas(filters);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Análisis completo con filtros por fecha, zona y material. Sin filtros, se muestran los últimos 30 días.
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

      {/* Evolución diaria */}
      {data && <EvolucionDiariaChart items={data.evolucion_diaria} />}

      {/* Rankings barra horizontal */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RankingChart
            title="Por recolectora"
            description="Kilos recolectados en el rango"
            items={data.por_recolectora.map((r) => ({
              id: r.id,
              label: r.nombre,
              kg: r.kg,
            }))}
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

      {/* Tablas detalladas */}
      {data && (
        <>
          <TablaImpactoFinanciero items={data.por_recolectora} />
          <TablaCo2Material items={data.por_material} />
        </>
      )}
    </div>
  );
}
