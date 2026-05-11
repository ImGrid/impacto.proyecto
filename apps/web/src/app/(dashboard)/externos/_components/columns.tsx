"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { AcopiadorCompradorExterno } from "@/types/api";
import { ExternosTableActions } from "./externos-table-actions";

export const columns: ColumnDef<AcopiadorCompradorExterno>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    id: "asociacion",
    header: "Asociación",
    cell: ({ row }) =>
      row.original.asociacion ?? (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "telefono",
    header: "Teléfono",
    cell: ({ row }) =>
      row.original.telefono ?? (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "activo",
    header: "Estado",
    cell: ({ row }) => {
      const activo = row.original.activo;
      return (
        <Badge variant={activo ? "default" : "secondary"}>
          {activo ? "Activo" : "Inactivo"}
        </Badge>
      );
    },
  },
  {
    id: "acciones",
    header: "",
    cell: ({ row }) => <ExternosTableActions externo={row.original} />,
  },
];
