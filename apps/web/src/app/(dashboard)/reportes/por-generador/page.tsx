"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Building2, Store } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type { ReportePorGenerador } from "@/types/reportes";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";

type Fila = {
  generador_id: number;
  generador: string;
  tipo_generador: string;
  sucursales: number;
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};

const columnas: ReporteColumna<Fila>[] = [
  { key: "generador", header: "Generador", format: "text" },
  { key: "tipo_generador", header: "Tipo", format: "text" },
  { key: "sucursales", header: "Sucursales", format: "int", align: "right" },
  { key: "transacciones", header: "Entregas", format: "int", align: "right" },
  { key: "kg", header: "Recolectado", format: "kg", align: "right" },
  { key: "co2_kg", header: "CO₂ evitado", format: "co2", align: "right" },
  { key: "bs", header: "Generado", format: "bs", align: "right" },
];

export default function PorGeneradorPage() {
  const [periodo, setPeriodo] = useState<Periodo>({});
  const { data, isLoading } = useReporte<ReportePorGenerador>(
    "por-generador",
    periodo,
  );

  const rows: Fila[] = (data?.items ?? []).map((g) => ({
    ...g,
    tipo_generador: g.tipo_generador ?? "—",
  }));

  return (
    <ReporteShell
      title="Cantidad por generador"
      description="Cuánto aportó cada empresa generadora a través de sus sucursales (solo material con origen identificado)."
      exportar={{ endpoint: "por-generador", filtros: periodo }}
    >
      <ReportePeriodoFiltro value={periodo} onChange={setPeriodo} />

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Generadores", value: data?.total.generadores ?? 0, decimals: 0, icon: <Building2 /> },
          { label: "Sucursales", value: data?.total.sucursales ?? 0, decimals: 0, icon: <Store /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      {rows.length > 0 && (
        <RankingChart
          title="Kilos por generador"
          description="Volumen aportado por cada empresa generadora en el período"
          items={rows.map((g) => ({
            id: g.generador_id,
            label: g.generador,
            kg: g.kg,
          }))}
        />
      )}

      <ReporteTabla
        columns={columnas}
        rows={rows}
        total={
          data
            ? {
                sucursales: data.total.sucursales,
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
