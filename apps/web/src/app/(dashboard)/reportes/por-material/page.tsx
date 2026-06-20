"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Users, Boxes } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type { ReportePorMaterial } from "@/types/reportes";
import { MultiSelect, type MultiOption } from "@/components/shared/multi-select";
import { useMateriales } from "@/hooks/use-materiales";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";

type Fila = ReportePorMaterial["items"][number];
type Filtros = Periodo & { material_id?: number[] };

const columnas: ReporteColumna<Fila>[] = [
  { key: "material", header: "Material", format: "text" },
  { key: "transacciones", header: "Entregas", format: "int", align: "right" },
  { key: "kg", header: "Recolectado", format: "kg", align: "right" },
  { key: "porcentaje", header: "% del total", format: "pct", align: "right" },
  { key: "co2_kg", header: "CO₂ evitado", format: "co2", align: "right" },
  { key: "bs", header: "Generado", format: "bs", align: "right" },
];

export default function PorMaterialPage() {
  const [filtros, setFiltros] = useState<Filtros>({});
  const { data, isLoading } = useReporte<ReportePorMaterial>(
    "por-material",
    filtros,
  );
  const { data: materiales } = useMateriales({ limit: 100, activo: true });
  const matOpts: MultiOption[] = (materiales?.data ?? []).map((m) => ({
    value: String(m.id),
    label: m.nombre,
  }));

  return (
    <ReporteShell
      title="Recolección por material"
      description="Cuánto se recicla de cada material, su porcentaje del total, CO₂ evitado e ingresos. Puedes acotar a ciertos materiales."
      exportar={{ endpoint: "por-material", filtros }}
      graficables
    >
      <ReportePeriodoFiltro
        value={filtros}
        onChange={(p) => setFiltros((f) => ({ ...f, ...p }))}
      >
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">Material</span>
          <MultiSelect
            options={matOpts}
            value={(filtros.material_id ?? []).map(String)}
            onChange={(v) =>
              setFiltros((f) => ({
                ...f,
                material_id: v.length ? v.map(Number) : undefined,
              }))
            }
            placeholder="Todos"
            noun={{ one: "material", many: "materiales" }}
            className="h-8 w-[190px]"
          />
        </div>
      </ReportePeriodoFiltro>

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Materiales", value: data?.items.length ?? 0, decimals: 0, icon: <Boxes /> },
          { label: "Recolectoras", value: data?.total.recolectoras ?? 0, decimals: 0, icon: <Users /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      {data && data.items.length > 0 && (
        <RankingChart
          title="Kilos por material"
          description="Volumen recolectado de cada material en el período"
          items={data.items.map((m) => ({
            id: m.material_id,
            label: m.material,
            kg: m.kg,
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
