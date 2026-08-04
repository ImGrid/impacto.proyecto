"use client";

import { useState } from "react";
import { Store, Recycle, Wallet, Leaf, Tags } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type {
  ReporteSucursalesLista,
  ReporteSucursalesFiltros,
} from "@/types/reportes";
import { ReporteShell } from "../_components/reporte-shell";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteTabla, type ReporteColumna } from "../_components/reporte-tabla";
import { NOTA_PCT, notaEntregas } from "../_components/notas";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";
import { SucursalesFiltros } from "./_components/sucursales-filtros";
import { SucursalDetalleDialog } from "./_components/sucursal-detalle-dialog";

type Fila = ReporteSucursalesLista["items"][number];

/**
 * Columnas de la tabla. Es una función porque la primera celda necesita el
 * callback del drill-through (abrir la ficha de la sucursal).
 */
const columnas = (abrir: (id: number) => void): ReporteColumna<Fila>[] => [
  {
    key: "sucursal",
    header: "Sucursal",
    format: "text",
    render: (s) => (
      <button
        type="button"
        onClick={() => abrir(s.sucursal_id)}
        className="text-primary text-left font-medium hover:underline"
      >
        {s.sucursal}
      </button>
    ),
  },
  { key: "generador", header: "Generador", format: "text" },
  { key: "tipo_generador", header: "Tipo", format: "text" },
  { key: "ciudad", header: "Ciudad", format: "text" },
  { key: "entregas", header: "Entregas", format: "int", align: "right" },
  { key: "kg", header: "Recolectado", format: "kg", align: "right" },
  { key: "porcentaje", header: "Participación por sucursal", format: "pct", align: "right" },
  { key: "co2_kg", header: "CO₂ evitado", format: "co2", align: "right" },
  { key: "bs", header: "Generado", format: "bs", align: "right" },
];

export default function SucursalesPage() {
  const [filtros, setFiltros] = useState<ReporteSucursalesFiltros>({});
  const { data, isLoading } = useReporte<ReporteSucursalesLista>(
    "sucursales",
    filtros,
  );

  // Drill-through a la ficha de una sucursal.
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const abrir = (id: number) => {
    setDetalleId(id);
    setOpen(true);
  };

  const items = data?.items ?? [];

  return (
    <ReporteShell
      title="Por sucursal"
      description="Cuánto entregó cada sucursal y su desglose por material. Filtra por generador (p. ej. un proyecto de colegios) o por tipo."
      exportar={{ endpoint: "sucursales", filtros }}
      graficables
    >
      <SucursalesFiltros value={filtros} onChange={setFiltros} />

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Sucursales", value: data?.total.sucursales ?? 0, decimals: 0, icon: <Store /> },
          { label: "Entregas", value: data?.total.transacciones ?? 0, decimals: 0, icon: <Tags /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      {data && items.length > 0 && (
        <RankingChart
          title="Kilos por sucursal"
          description="Top sucursales por volumen recolectado (haz clic en una barra para ver su detalle)"
          items={items.map((s) => ({
            id: s.sucursal_id,
            label: s.sucursal,
            kg: s.kg,
          }))}
          onItemClick={abrir}
        />
      )}

      <ReporteTabla
        columns={columnas(abrir)}
        rows={items}
        emptyLabel="No hay sucursales que cumplan los filtros."
        total={
          data
            ? {
                // `entregas` fuera del TOTAL: una entrega puede traer material
                // de varias sucursales, así que la columna suma más que las
                // entregas reales (el número correcto está en el KPI de arriba).
                kg: data.total.kg,
                ...(data.total.kg > 0 ? { porcentaje: 100 } : {}),
                co2_kg: data.total.co2_kg,
                bs: data.total.bs,
              }
            : undefined
        }
        nota={`${NOTA_PCT} ${notaEntregas("material de varias sucursales")}`}
      />

      <SucursalDetalleDialog
        id={detalleId}
        periodo={{ desde: filtros.desde, hasta: filtros.hasta }}
        open={open}
        onOpenChange={setOpen}
      />
    </ReporteShell>
  );
}
