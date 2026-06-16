"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Users, MapPin } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type { ReportePorZona } from "@/types/reportes";
import { type MultiOption } from "@/components/shared/multi-select";
import { useZonas } from "@/hooks/use-zonas";
import { useDepartamentoActivo } from "@/components/departamento-context";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { ReporteFiltroExtra } from "../_components/reporte-filtro-extra";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";

type Fila = ReportePorZona["items"][number];
type Filtros = Periodo & { zona_id?: number[] };

const columnas: ReporteColumna<Fila>[] = [
  { key: "zona", header: "Zona", format: "text" },
  { key: "ciudad", header: "Ciudad", format: "text" },
  { key: "recolectoras", header: "Recolectoras", format: "int", align: "right" },
  { key: "transacciones", header: "Entregas", format: "int", align: "right" },
  { key: "kg", header: "Recolectado", format: "kg", align: "right" },
  { key: "co2_kg", header: "CO₂ evitado", format: "co2", align: "right" },
  { key: "bs", header: "Generado", format: "bs", align: "right" },
];

export default function PorZonaPage() {
  const [filtros, setFiltros] = useState<Filtros>({});
  const { data, isLoading } = useReporte<ReportePorZona>("por-zona", filtros);
  const depto = useDepartamentoActivo();
  const { data: zonas } = useZonas({
    limit: 100,
    activo: true,
    departamentoId: depto ?? undefined,
  });
  const zonaOpts: MultiOption[] = (zonas?.data ?? []).map((z) => ({
    value: String(z.id),
    label: z.nombre,
  }));

  return (
    <ReporteShell
      title="Recolección por zona"
      description="Volumen recolectado, ingresos y CO₂ por zona y ciudad. Puedes acotar a ciertas zonas."
      exportar={{ endpoint: "por-zona", filtros }}
    >
      <ReportePeriodoFiltro
        value={filtros}
        onChange={(p) => setFiltros((f) => ({ ...f, ...p }))}
      >
        <ReporteFiltroExtra
          label="Zona"
          options={zonaOpts}
          value={filtros.zona_id}
          onChange={(v) => setFiltros((f) => ({ ...f, zona_id: v }))}
          noun={{ one: "zona", many: "zonas" }}
        />
      </ReportePeriodoFiltro>

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Zonas", value: data?.items.length ?? 0, decimals: 0, icon: <MapPin /> },
          { label: "Recolectoras", value: data?.total.recolectoras ?? 0, decimals: 0, icon: <Users /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      {data && data.items.length > 0 && (
        <RankingChart
          title="Kilos por zona"
          description="Volumen recolectado por cada zona en el período"
          items={data.items.map((z) => ({
            id: z.zona_id,
            label: z.zona,
            kg: z.kg,
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
