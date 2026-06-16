"use client";

import { useState } from "react";
import { Recycle, Wallet, Leaf, Users, UserCheck } from "lucide-react";
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
  ReporteRecolectorasLista,
  ReporteRecolectorasFiltros,
} from "@/types/reportes";
import { ReporteShell } from "../_components/reporte-shell";
import { ReporteResumen } from "../_components/reporte-resumen";
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

  const items = data?.items ?? [];

  return (
    <ReporteShell
      title="Recolectoras"
      description="Filtra por edad, género, asociación, zona o material, y haz clic en una recolectora para ver su perfil declarado y su actividad real."
      exportar={{ endpoint: "recolectoras", filtros }}
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

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
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
                  colSpan={8}
                  className="text-muted-foreground py-10 text-center text-sm"
                >
                  No hay recolectoras que cumplan los filtros.
                </TableCell>
              </TableRow>
            ) : (
              items.map((r) => (
                <TableRow key={r.id}>
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
