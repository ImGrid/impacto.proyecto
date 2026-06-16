"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, ArrowRightLeft, Boxes } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type { ReportePorDestino } from "@/types/reportes";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";

// El backend devuelve el tipo como código; aquí se muestra en lenguaje claro.
const TIPO_LABEL: Record<string, string> = {
  centro_op: "Centro operacional",
  externo: "Externo",
  desconocido: "Desconocido",
  sin_asignar: "Sin asignar",
};

type Fila = {
  destino: string;
  tipo: string;
  transacciones: number;
  kg: number;
  co2_kg: number;
  bs: number;
};

const columnas: ReporteColumna<Fila>[] = [
  { key: "destino", header: "Destino", format: "text" },
  { key: "tipo", header: "Tipo", format: "text" },
  { key: "transacciones", header: "Entregas", format: "int", align: "right" },
  { key: "kg", header: "Recolectado", format: "kg", align: "right" },
  { key: "co2_kg", header: "CO₂ evitado", format: "co2", align: "right" },
  { key: "bs", header: "Generado", format: "bs", align: "right" },
];

export default function PorDestinoPage() {
  const [periodo, setPeriodo] = useState<Periodo>({});
  const { data, isLoading } = useReporte<ReportePorDestino>(
    "por-destino",
    periodo,
  );

  const rows: Fila[] = (data?.items ?? []).map((d) => ({
    destino: d.destino,
    tipo: TIPO_LABEL[d.tipo_destino] ?? d.tipo_destino,
    transacciones: d.transacciones,
    kg: d.kg,
    co2_kg: d.co2_kg,
    bs: d.bs,
  }));

  return (
    <ReporteShell
      title="Recolección por destino"
      description="A dónde fue lo recolectado: centro operacional, comprador externo o desconocido."
      exportar={{ endpoint: "por-destino", filtros: periodo }}
    >
      <ReportePeriodoFiltro value={periodo} onChange={setPeriodo} />

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Destinos", value: rows.length, decimals: 0, icon: <ArrowRightLeft /> },
          { label: "Entregas", value: data?.total.transacciones ?? 0, decimals: 0, icon: <Boxes /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      {rows.length > 0 && (
        <RankingChart
          title="Kilos por destino"
          description="Volumen entregado a cada destino en el período"
          items={rows.map((r, i) => ({ id: i, label: r.destino, kg: r.kg }))}
        />
      )}

      <ReporteTabla
        columns={columnas}
        rows={rows}
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
