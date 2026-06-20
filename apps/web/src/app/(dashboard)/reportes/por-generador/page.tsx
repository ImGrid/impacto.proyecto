"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Building2, Store } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type { ReportePorGenerador } from "@/types/reportes";
import { type MultiOption } from "@/components/shared/multi-select";
import { useGeneradores } from "@/hooks/use-generadores";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { ReporteFiltroExtra } from "../_components/reporte-filtro-extra";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";

type Filtros = Periodo & { generador_id?: number[] };

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
  const [filtros, setFiltros] = useState<Filtros>({});
  const { data, isLoading } = useReporte<ReportePorGenerador>(
    "por-generador",
    filtros,
  );
  const { data: generadores } = useGeneradores({ limit: 100, activo: true });
  const genOpts: MultiOption[] = (generadores?.data ?? []).map((g) => ({
    value: String(g.id),
    label: g.razon_social,
  }));

  const rows: Fila[] = (data?.items ?? []).map((g) => ({
    ...g,
    tipo_generador: g.tipo_generador ?? "—",
  }));

  return (
    <ReporteShell
      title="Cantidad por generador"
      description="Cuánto aportó cada empresa generadora a través de sus sucursales. Puedes acotar a ciertos generadores."
      exportar={{ endpoint: "por-generador", filtros }}
      graficables
    >
      <ReportePeriodoFiltro
        value={filtros}
        onChange={(p) => setFiltros((f) => ({ ...f, ...p }))}
      >
        <ReporteFiltroExtra
          label="Generador"
          options={genOpts}
          value={filtros.generador_id}
          onChange={(v) => setFiltros((f) => ({ ...f, generador_id: v }))}
          noun={{ one: "generador", many: "generadores" }}
          width="w-[200px]"
        />
      </ReportePeriodoFiltro>

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
