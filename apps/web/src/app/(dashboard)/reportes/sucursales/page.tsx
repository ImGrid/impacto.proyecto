"use client";

import { useState } from "react";
import { Store, Recycle, Wallet, Leaf, Tags } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReporte } from "@/hooks/use-reportes";
import type {
  ReporteSucursalesLista,
  ReporteSucursalesFiltros,
} from "@/types/reportes";
import { ReporteShell } from "../_components/reporte-shell";
import { ReporteResumen } from "../_components/reporte-resumen";
import { fmt } from "../_components/format";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";
import { SucursalesFiltros } from "./_components/sucursales-filtros";
import { SucursalDetalleDialog } from "./_components/sucursal-detalle-dialog";

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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sucursal</TableHead>
              <TableHead>Generador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Ciudad</TableHead>
              <TableHead className="text-right">Entregas</TableHead>
              <TableHead className="text-right">Recolectado</TableHead>
              <TableHead className="text-right">CO₂ evitado</TableHead>
              <TableHead className="text-right">Generado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  No hay sucursales que cumplan los filtros.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.sucursal_id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => abrir(s.sucursal_id)}
                      className="text-primary text-left font-medium hover:underline"
                    >
                      {s.sucursal}
                    </button>
                  </TableCell>
                  <TableCell>{s.generador}</TableCell>
                  <TableCell>{s.tipo_generador}</TableCell>
                  <TableCell>{s.ciudad}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.entregas}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(s.kg, "kg")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(s.co2_kg, "co2")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(s.bs, "bs")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <SucursalDetalleDialog
        id={detalleId}
        periodo={{ desde: filtros.desde, hasta: filtros.hasta }}
        open={open}
        onOpenChange={setOpen}
      />
    </ReporteShell>
  );
}
