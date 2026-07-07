"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Building2, Store } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { fmt } from "../_components/format";
import { ReporteFiltroExtra } from "../_components/reporte-filtro-extra";
import { RankingChart } from "../../estadisticas/_components/ranking-chart";
import { GeneradorDetalleDialog } from "./_components/generador-detalle-dialog";

type Filtros = Periodo & { generador_id?: number[] };

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

  // Drill-through a la ficha de un generador.
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const abrir = (id: number) => {
    setDetalleId(id);
    setOpen(true);
  };

  const items = data?.items ?? [];

  return (
    <ReporteShell
      title="Cantidad por generador"
      description="Cuánto aportó cada empresa generadora a través de sus sucursales. Haz clic en un generador para ver sus sucursales y entregas."
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

      {items.length > 0 && (
        <RankingChart
          title="Kilos por generador"
          description="Volumen aportado por cada empresa generadora (haz clic en una barra para ver su detalle)"
          items={items.map((g) => ({
            id: g.generador_id,
            label: g.generador,
            kg: g.kg,
          }))}
          onItemClick={abrir}
        />
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Generador</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Sucursales</TableHead>
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
                  colSpan={7}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  No hay generadores con actividad en el período.
                </TableCell>
              </TableRow>
            ) : (
              items.map((g) => (
                <TableRow key={g.generador_id}>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => abrir(g.generador_id)}
                      className="text-primary text-left font-medium hover:underline"
                    >
                      {g.generador}
                    </button>
                  </TableCell>
                  <TableCell>{g.tipo_generador ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.sucursales}</TableCell>
                  <TableCell className="text-right tabular-nums">{g.transacciones}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(g.kg, "kg")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(g.co2_kg, "co2")}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmt(g.bs, "bs")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <GeneradorDetalleDialog
        id={detalleId}
        periodo={{ desde: filtros.desde, hasta: filtros.hasta }}
        open={open}
        onOpenChange={setOpen}
      />
    </ReporteShell>
  );
}
