"use client";

import { useState } from "react";
import { Recycle, Boxes, Tags } from "lucide-react";
import { useReporte } from "@/hooks/use-reportes";
import type { ReporteMatriz } from "@/types/reportes";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type MultiOption } from "@/components/shared/multi-select";
import { useMateriales } from "@/hooks/use-materiales";
import { useTiposGenerador } from "@/hooks/use-tipos-generador";
import { ReporteShell } from "../_components/reporte-shell";
import {
  ReportePeriodoFiltro,
  type Periodo,
} from "../_components/reporte-periodo-filtro";
import { ReporteResumen } from "../_components/reporte-resumen";
import { ReporteFiltroExtra } from "../_components/reporte-filtro-extra";
import { fmtNum } from "../_components/format";

type Filtros = Periodo & {
  material_id?: number[];
  tipo_generador_id?: number[];
};

/** Orden de valores únicos por kg total descendente. */
function ordenarPorKg(
  items: ReporteMatriz["items"],
  campo: "material" | "tipo_generador",
): string[] {
  const tot = new Map<string, number>();
  for (const it of items) tot.set(it[campo], (tot.get(it[campo]) ?? 0) + it.kg);
  return [...tot.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
}

export default function PorMaterialTipoGeneradorPage() {
  const [filtros, setFiltros] = useState<Filtros>({});
  const { data, isLoading } = useReporte<ReporteMatriz>(
    "por-material-tipo-generador",
    filtros,
  );
  const { data: materialesCat } = useMateriales({ limit: 100, activo: true });
  const { data: tiposCat } = useTiposGenerador({ limit: 100, activo: true });
  const matOpts: MultiOption[] = (materialesCat?.data ?? []).map((m) => ({
    value: String(m.id),
    label: m.nombre,
  }));
  const tipoOpts: MultiOption[] = (tiposCat?.data ?? []).map((t) => ({
    value: String(t.id),
    label: t.nombre,
  }));

  const items = data?.items ?? [];
  const materiales = ordenarPorKg(items, "material");
  const tipos = ordenarPorKg(items, "tipo_generador");

  // celda[material|tipo] = kg
  const celda = new Map<string, number>();
  for (const it of items) celda.set(`${it.material}|${it.tipo_generador}`, it.kg);
  const kg = (m: string, t: string) => celda.get(`${m}|${t}`) ?? 0;
  const totalFila = (m: string) => tipos.reduce((s, t) => s + kg(m, t), 0);
  const totalCol = (t: string) => materiales.reduce((s, m) => s + kg(m, t), 0);

  return (
    <ReporteShell
      title="Material × tipo de generador"
      description="Qué residuo (kg) proviene de qué tipo de fuente. Solo material con origen identificado."
      exportar={{ endpoint: "por-material-tipo-generador", filtros }}
    >
      <ReportePeriodoFiltro
        value={filtros}
        onChange={(p) => setFiltros((f) => ({ ...f, ...p }))}
      >
        <ReporteFiltroExtra
          label="Material"
          options={matOpts}
          value={filtros.material_id}
          onChange={(v) => setFiltros((f) => ({ ...f, material_id: v }))}
          noun={{ one: "material", many: "materiales" }}
        />
        <ReporteFiltroExtra
          label="Tipo de generador"
          options={tipoOpts}
          value={filtros.tipo_generador_id}
          onChange={(v) => setFiltros((f) => ({ ...f, tipo_generador_id: v }))}
          noun={{ one: "tipo", many: "tipos" }}
        />
      </ReportePeriodoFiltro>

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Materiales", value: materiales.length, decimals: 0, icon: <Boxes /> },
          { label: "Tipos de generador", value: tipos.length, decimals: 0, icon: <Tags /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
        ]}
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Material</TableHead>
              {tipos.map((t) => (
                <TableHead key={t} className="text-right">
                  {t}
                </TableHead>
              ))}
              <TableHead className="text-right font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materiales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={tipos.length + 2}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  Sin datos con origen identificado en el período.
                </TableCell>
              </TableRow>
            ) : (
              <>
                {materiales.map((m) => (
                  <TableRow key={m}>
                    <TableCell>{m}</TableCell>
                    {tipos.map((t) => {
                      const v = kg(m, t);
                      return (
                        <TableCell key={t} className="text-right tabular-nums">
                          {v > 0 ? (
                            `${fmtNum(v, 2)} kg`
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-medium tabular-nums">
                      {fmtNum(totalFila(m), 2)} kg
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="border-t-2 font-semibold">
                  <TableCell>TOTAL</TableCell>
                  {tipos.map((t) => (
                    <TableCell key={t} className="text-right tabular-nums">
                      {fmtNum(totalCol(t), 2)} kg
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">
                    {fmtNum(data?.total.kg ?? 0, 2)} kg
                  </TableCell>
                </TableRow>
              </>
            )}
          </TableBody>
        </Table>
      </div>
    </ReporteShell>
  );
}
