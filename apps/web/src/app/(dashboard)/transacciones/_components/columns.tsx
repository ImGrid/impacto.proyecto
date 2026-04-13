"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Transaccion } from "@/types/api";

const estadoConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  GENERADO: { label: "Generado", variant: "outline" },
  RECOLECTADO: { label: "Recolectado", variant: "secondary" },
  ENTREGADO: { label: "Entregado", variant: "default" },
  PAGADO: { label: "Pagado", variant: "default" },
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMateriales(detalles: Transaccion["detalle_transaccion"]): string {
  if (!detalles || detalles.length === 0) return "—";
  return detalles
    .map((d) => `${d.material.nombre} ${d.cantidad}${d.unidad_medida.toLowerCase()}`)
    .join(", ");
}

export const columns: ColumnDef<Transaccion>[] = [
  {
    accessorKey: "id",
    header: "#",
    cell: ({ row }) => <span className="text-muted-foreground">#{row.original.id}</span>,
  },
  {
    id: "fecha",
    header: "Fecha",
    cell: ({ row }) => formatDate(row.original.fecha),
  },
  {
    id: "recolector",
    header: "Recolector",
    cell: ({ row }) =>
      row.original.recolector?.nombre_completo ?? (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "acopiador",
    header: "Acopiador",
    cell: ({ row }) =>
      row.original.acopiador?.nombre_completo ?? (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "zona",
    header: "Zona",
    cell: ({ row }) => row.original.zona.nombre,
  },
  {
    id: "materiales",
    header: "Materiales",
    cell: ({ row }) => (
      <span className="max-w-[200px] truncate block text-sm">
        {formatMateriales(row.original.detalle_transaccion)}
      </span>
    ),
  },
  {
    id: "monto",
    header: "Monto",
    cell: ({ row }) => {
      const monto = Number(row.original.monto_total);
      if (monto === 0) return <span className="text-muted-foreground">—</span>;
      return <span className="font-medium">{monto.toFixed(2)} Bs</span>;
    },
  },
  {
    id: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const config = estadoConfig[row.original.estado];
      return <Badge variant={config?.variant ?? "outline"}>{config?.label ?? row.original.estado}</Badge>;
    },
  },
];
