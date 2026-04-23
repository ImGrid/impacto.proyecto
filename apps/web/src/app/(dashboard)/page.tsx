"use client";

import {
  Recycle,
  Wallet,
  Leaf,
  Users,
} from "lucide-react";
import { useDashboard } from "@/hooks/use-dashboard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { KpiCard } from "./_components/kpi-card";
import { AlertasCard } from "./_components/alertas-card";
import { EvolucionChart } from "./_components/evolucion-chart";
import { MaterialPieChart } from "./_components/material-pie-chart";
import { TopList } from "./_components/top-list";

/**
 * Dashboard principal (operational).
 *
 * Jerarquía visual (inverted pyramid):
 * 1. KPIs (resumen rápido para la "regla de los 5 segundos").
 * 2. Alertas accionables (qué requiere acción ahora).
 * 3. Tendencias (cómo vamos).
 * 4. Detalles top (quién destaca).
 *
 * Grid de 12 columnas con responsive:
 * - Móvil: 1 columna.
 * - Tablet: 2 columnas.
 * - Desktop: 4 columnas para KPIs, 2 para gráficos y tops.
 */
export default function DashboardPage() {
  const { data, isLoading } = useDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Resumen del mes actual. Se actualiza cada 2 minutos.
          </p>
        </div>
      </div>

      {/* Fila de KPIs — 4 cards, máximo 9 según best practice */}
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

      {/* Alertas operacionales */}
      {data && (
        <AlertasCard
          pendientes_pago_count={data.alertas.pendientes_pago_count}
          pendientes_pago_monto={data.alertas.pendientes_pago_monto}
          pendientes_verificacion_count={
            data.alertas.pendientes_verificacion_count
          }
        />
      )}

      {/* Gráficos — 2 columnas lg, 1 en móvil */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <EvolucionChart data={data.evolucion_mensual} />
          <MaterialPieChart data={data.distribucion_material} />
        </div>
      )}

      {/* Tops — 2 columnas lg, 1 en móvil */}
      {data && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TopList
            title="Top recolectoras del mes"
            description="Por kilos entregados"
            items={data.top_recolectoras.map((r) => ({
              id: r.id,
              nombre: r.nombre,
              valor: r.kg,
              subtitulo: `${r.bs.toFixed(2)} Bs ganados`,
            }))}
          />
          <TopList
            title="Top sucursales del mes"
            description="De dónde viene más material"
            items={data.top_sucursales.map((s) => ({
              id: s.id,
              nombre: s.nombre,
              valor: s.kg,
              subtitulo: s.generador,
            }))}
          />
        </div>
      )}

      {/* Link a análisis completo (pendiente en Fase 2) */}
      <div className="border-t pt-4">
        <Button variant="outline" asChild>
          <Link href="/transacciones">
            Ver historial de transacciones
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
