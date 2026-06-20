"use client";

import { useMemo, useState } from "react";
import {
  Recycle,
  Wallet,
  Leaf,
  Users,
  UserCheck,
  FileSpreadsheet,
  FileText,
  X,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useReporte } from "@/hooks/use-reportes";
import type {
  ReporteRecolectorasLista,
  ReporteRecolectorasFiltros,
} from "@/types/reportes";
import { ReporteShell } from "../_components/reporte-shell";
import { ReporteResumen } from "../_components/reporte-resumen";
import { reporteParams } from "../_components/query";
import { fmt } from "../_components/format";
import { RecolectorasFiltros } from "./_components/recolectoras-filtros";
import { RecolectoraDetalleDialog } from "./_components/recolectora-detalle-dialog";

const GENERO: Record<string, string> = { MUJER: "Mujer", HOMBRE: "Hombre" };

export default function RecolectorasPage() {
  const [filtros, setFiltros] = useState<ReporteRecolectorasFiltros>({});
  const { data, isLoading } = useReporte<ReporteRecolectorasLista>(
    "recolectoras",
    filtros,
  );

  // Drill-through al detalle de una recolectora.
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const abrir = (id: number) => {
    setDetalleId(id);
    setOpen(true);
  };

  const items = useMemo(() => data?.items ?? [], [data]);

  // Selección a mano de recolectoras específicas (para exportarlas).
  const [sel, setSel] = useState<Set<number>>(new Set());
  const idsPagina = items.map((r) => r.id);
  const todasMarcadas = idsPagina.length > 0 && idsPagina.every((id) => sel.has(id));

  const toggle = (id: number) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleTodas = () =>
    setSel((prev) => {
      const next = new Set(prev);
      if (todasMarcadas) idsPagina.forEach((id) => next.delete(id));
      else idsPagina.forEach((id) => next.add(id));
      return next;
    });

  function exportarSeleccionadas(formato: "excel" | "pdf") {
    if (sel.size === 0) return;
    const params = reporteParams({
      desde: filtros.desde,
      hasta: filtros.hasta,
      ids: [...sel],
    });
    params.set("formato", formato);
    const a = document.createElement("a");
    a.href = `/api/reportes/recolectoras/export?${params.toString()}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <ReporteShell
      title="Recolectoras"
      description="Filtra por edad, género, asociación, zona o material (puedes elegir varios), o marca recolectoras específicas para exportarlas."
      exportar={{ endpoint: "recolectoras", filtros }}
      graficables
    >
      <RecolectorasFiltros value={filtros} onChange={setFiltros} />

      <ReporteResumen
        loading={isLoading}
        items={[
          { label: "Recolectoras", value: data?.total.recolectoras ?? 0, decimals: 0, icon: <Users /> },
          { label: "Con entregas", value: data?.total.activas ?? 0, decimals: 0, icon: <UserCheck /> },
          { label: "Recolectado", value: data?.total.kg ?? 0, decimals: 2, unit: "kg", icon: <Recycle /> },
          { label: "CO₂ evitado", value: data?.total.co2_kg ?? 0, decimals: 2, unit: "kg", icon: <Leaf /> },
          { label: "Generado", value: data?.total.bs ?? 0, decimals: 2, unit: "Bs", icon: <Wallet /> },
        ]}
      />

      {/* Barra contextual de selección (aparece al marcar filas). */}
      {sel.size > 0 && (
        <div className="bg-primary/5 border-primary/20 flex flex-wrap items-center gap-3 rounded-md border px-3 py-2">
          <span className="text-sm font-medium">
            {sel.size} recolectora{sel.size === 1 ? "" : "s"} seleccionada
            {sel.size === 1 ? "" : "s"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportarSeleccionadas("excel")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportarSeleccionadas("pdf")}>
              <FileText className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSel(new Set())}>
              <X className="mr-1 h-3.5 w-3.5" />
              Quitar
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="h-4 w-4 align-middle"
                  checked={todasMarcadas}
                  onChange={toggleTodas}
                  aria-label="Seleccionar todas las de la página"
                />
              </TableHead>
              <TableHead>Recolectora</TableHead>
              <TableHead className="text-right">Edad</TableHead>
              <TableHead>Género</TableHead>
              <TableHead>Zona</TableHead>
              <TableHead>Asociación</TableHead>
              <TableHead className="text-right">Entregas</TableHead>
              <TableHead className="text-right">Recolectado</TableHead>
              <TableHead className="text-right">Generado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  No hay recolectoras que cumplan los filtros.
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id} className={cn(sel.has(r.id) && "bg-primary/5")}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="h-4 w-4 align-middle"
                      checked={sel.has(r.id)}
                      onChange={() => toggle(r.id)}
                      aria-label={`Seleccionar ${r.nombre}`}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => abrir(r.id)}
                      className="text-primary text-left font-medium hover:underline"
                    >
                      {r.nombre}
                    </button>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{r.edad}</TableCell>
                  <TableCell>{GENERO[r.genero] ?? r.genero}</TableCell>
                  <TableCell>{r.zona}</TableCell>
                  <TableCell>{r.asociacion ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.entregas}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.entregas > 0 ? fmt(r.kg, "kg") : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.entregas > 0 ? fmt(r.bs, "bs") : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <RecolectoraDetalleDialog
        id={detalleId}
        periodo={{ desde: filtros.desde, hasta: filtros.hasta }}
        open={open}
        onOpenChange={setOpen}
      />
    </ReporteShell>
  );
}
