"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Users, UsersRound } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type { ReportePorAsociacion } from "@/types/reportes";
import { type MultiOption } from "@/components/shared/multi-select";
import { useAsociaciones } from "@/hooks/use-asociaciones";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { ReporteFiltroExtra } from "../_components/reporte-filtro-extra";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";

type Fila = ReportePorAsociacion["items"][number];
type Filtros = Periodo & { asociacion_id?: number[] };

const columnas: ReporteColumna<Fila>[] = [
  { key: "asociacion", header: "Asociación", format: "text" },
  { key: "recolectoras", header: "Recolectoras", format: "int", align: "right" },
  { key: "transacciones", header: "Entregas", format: "int", align: "right" },
  { key: "kg", header: "Recolectado", format: "kg", align: "right" },
  { key: "co2_kg", header: "CO₂ evitado", format: "co2", align: "right" },
  { key: "bs", header: "Generado", format: "bs", align: "right" },
];

export default function PorAsociacionPage() {
  const [filtros, setFiltros] = useState<Filtros>({});
  const { data, isLoading } = useReporte<ReportePorAsociacion>(
    "por-asociacion",
    filtros,
  );
  const { data: asociaciones } = useAsociaciones({ limit: 100, activo: true });
  const asocOpts: MultiOption[] = (asociaciones?.data ?? []).map((a) => ({
    value: String(a.id),
    label: a.nombre,
  }));

  return (
    <ReporteShell
      title="Recolección por asociación"
      description="Cuánto recolectó, generó (Bs) y evitó en CO₂ cada asociación o iniciativa. Puedes acotar a ciertas asociaciones."
      exportar={{ endpoint: "por-asociacion", filtros }}
      graficables
    >
      <ReportePeriodoFiltro
        value={filtros}
        onChange={(p) => setFiltros((f) => ({ ...f, ...p }))}
      >
        <ReporteFiltroExtra
          label="Asociación"
          options={asocOpts}
          value={filtros.asociacion_id}
          onChange={(v) => setFiltros((f) => ({ ...f, asociacion_id: v }))}
          noun={{ one: "asociación", many: "asociaciones" }}
        />
      </ReportePeriodoFiltro>

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Asociaciones", value: data?.items.length ?? 0, decimals: 0, icon: <Users /> },
          { label: "Recolectoras", value: data?.total.recolectoras ?? 0, decimals: 0, icon: <UsersRound /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      {data && data.items.length > 0 && (
        <RankingChart
          title="Kilos por asociación"
          description="Volumen recolectado por cada asociación en el período"
          items={data.items.map((a) => ({
            id: a.asociacion_id,
            label: a.asociacion,
            kg: a.kg,
          }))}
        />
      )}

      <ReporteTabla
        columns={columnas}
        rows={data?.items ?? []}
        total={
          data
            ? {
                recolectoras: data.total.recolectoras,
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
