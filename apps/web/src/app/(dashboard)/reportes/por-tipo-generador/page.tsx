"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Tags, Boxes } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type { ReportePorTipoGenerador } from "@/types/reportes";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";

type Fila = ReportePorTipoGenerador["items"][number];

const columnas: ReporteColumna<Fila>[] = [
  { key: "tipo_generador", header: "Tipo de generador", format: "text" },
  { key: "generadores", header: "Generadores", format: "int", align: "right" },
  { key: "transacciones", header: "Entregas", format: "int", align: "right" },
  { key: "kg", header: "Recolectado", format: "kg", align: "right" },
  { key: "co2_kg", header: "CO₂ evitado", format: "co2", align: "right" },
  { key: "bs", header: "Generado", format: "bs", align: "right" },
];

export default function PorTipoGeneradorPage() {
  const [periodo, setPeriodo] = useState<Periodo>({});
  const { data, isLoading } = useReporte<ReportePorTipoGenerador>(
    "por-tipo-generador",
    periodo,
  );

  return (
    <ReporteShell
      title="Recolección por tipo de generador"
      description="Qué cantidad proviene de bancos, ferias, colegios y demás tipos de fuente (solo material con origen identificado)."
      exportar={{ endpoint: "por-tipo-generador", filtros: periodo }}
    >
      <ReportePeriodoFiltro value={periodo} onChange={setPeriodo} />

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Tipos", value: data?.items.length ?? 0, decimals: 0, icon: <Tags /> },
          { label: "Entregas", value: data?.total.transacciones ?? 0, decimals: 0, icon: <Boxes /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      {data && data.items.length > 0 && (
        <RankingChart
          title="Kilos por tipo de generador"
          description="Volumen recolectado según el tipo de fuente generadora"
          items={data.items.map((t) => ({
            id: t.tipo_generador_id,
            label: t.tipo_generador,
            kg: t.kg,
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
