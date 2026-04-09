"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Asociacion } from "@/types/api";
import { AsociacionesTableActions } from "./asociaciones-table-actions";

export const columns: ColumnDef<Asociacion>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    accessorKey: "representante",
    header: "Representante",
    cell: ({ row }) => {
      const val = row.getValue<string | null>("representante");
      if (!val) return <span className="text-muted-foreground">—</span>;
      return val;
    },
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
    cell: ({ row }) => {
      const val = row.getValue<string | null>("telefono");
      if (!val) return <span className="text-muted-foreground">—</span>;
      return val;
    },
  },
  {
    accessorKey: "activo",
    header: "Estado",
    cell: ({ row }) => {
      const activo = row.getValue<boolean>("activo");
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
    cell: ({ row }) => (
      <AsociacionesTableActions asociacion={row.original} />
    ),
  },
];
