"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Pago } from "@/types/api";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const columns: ColumnDef<Pago>[] = [
  {
    accessorKey: "id",
    header: "#",
    cell: ({ row }) => (
      <span className="text-muted-foreground">#{row.original.id}</span>
    ),
  },
  {
    id: "fecha",
    header: "Fecha",
    cell: ({ row }) => formatDate(row.original.fecha_pago),
  },
  {
    id: "recolector",
    header: "Recolector",
    cell: ({ row }) => row.original.recolector.nombre_completo,
  },
  {
    id: "acopiador",
    header: "Acopiador",
    cell: ({ row }) => row.original.acopiador.nombre_completo,
  },
  {
    id: "monto",
    header: "Monto",
    cell: ({ row }) => (
      <span className="font-medium">
        {Number(row.original.monto_total).toFixed(2)} Bs
      </span>
    ),
  },
  {
    id: "transacciones",
    header: "Transacciones",
    cell: ({ row }) => {
      const count = row.original.pago_transaccion.length;
      return (
        <Badge variant="secondary">
          {count} {count === 1 ? "entrega" : "entregas"}
        </Badge>
      );
    },
  },
  {
    id: "observaciones",
    header: "Observaciones",
    cell: ({ row }) =>
      row.original.observaciones ?? (
        <span className="text-muted-foreground">—</span>
      ),
  },
];
