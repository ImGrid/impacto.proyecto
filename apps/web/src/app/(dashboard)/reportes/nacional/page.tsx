"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReporte } from "@/hooks/use-reportes";
import type { ReporteNacional } from "@/types/reportes";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { NacionalBarras } from "./_components/nacional-barras";

type Fila = ReporteNacional["items"][number];

// Métrica seleccionable para el gráfico de comparación (decisión del cliente:
// 3 métricas, kg por defecto). La tabla siempre muestra las tres.
type Metrica = "kg" | "bs" | "co2_kg";
const METRICAS: { v: Metrica; l: string; unidad: string }[] = [
  { v: "kg", l: "Recolectado", unidad: "kg" },
  { v: "bs", l: "Generado", unidad: "Bs" },
  { v: "co2_kg", l: "CO₂ evitado", unidad: "kg CO₂" },
];

const columnas: ReporteColumna<Fila>[] = [
  { key: "departamento", header: "Departamento", format: "text" },
  { key: "transacciones", header: "Entregas", format: "int", align: "right" },
  { key: "kg", header: "Recolectado", format: "kg", align: "right" },
  { key: "co2_kg", header: "CO₂ evitado", format: "co2", align: "right" },
  { key: "bs", header: "Generado", format: "bs", align: "right" },
];

export default function NacionalPage() {
  const [filtros, setFiltros] = useState<Periodo>({});
  const [metrica, setMetrica] = useState<Metrica>("kg");
  const { data, isLoading } = useReporte<ReporteNacional>("nacional", filtros);

  const metricaSel = METRICAS.find((m) => m.v === metrica)!;
  const conDatos = (data?.items ?? []).filter(
    (d) => d.kg > 0 || d.bs > 0 || d.co2_kg > 0,
  );

  return (
    <ReporteShell
      title="Comparación nacional"
      description="Compara cuánto recolectó, generó (Bs) y evitó en CO₂ cada departamento."
      exportar={{ endpoint: "nacional", filtros: { ...filtros, metrica } }}
      graficables
    >
      <ReportePeriodoFiltro
        value={filtros}
        onChange={(p) => setFiltros((f) => ({ ...f, ...p }))}
        sinFechasLabel="Si no eliges fechas, se muestra todo el historial"
      />

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Departamentos con datos", value: conDatos.length, decimals: 0, icon: <Building2 /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">
          Comparar por
        </span>
        <div className="bg-muted inline-flex w-fit rounded-md p-0.5">
          {METRICAS.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setMetrica(m.v)}
              className={cn(
                "rounded-sm px-3 py-1 text-xs font-medium transition-colors",
                metrica === m.v
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m.l}
            </button>
          ))}
        </div>
      </div>

      {data && conDatos.length > 0 && (
        <NacionalBarras
          title={`Comparación por departamento — ${metricaSel.l}`}
          description="Cada barra es un departamento en el período seleccionado"
          unidad={metricaSel.unidad}
          items={data.items.map((d) => ({
            label: d.departamento,
            value: Number(d[metrica]),
          }))}
        />
      )}

      <ReporteTabla
        columns={columnas}
        rows={data?.items ?? []}
        total={
          data
            ? {
                transacciones: data.total.transacciones,
                kg: data.total.kg,
                co2_kg: data.total.co2_kg,
                bs: data.total.bs,
              }
            : undefined
        }
      />
    </ReporteShell>
  );
}
