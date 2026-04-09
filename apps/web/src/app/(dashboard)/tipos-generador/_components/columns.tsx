"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { TipoGenerador } from "@/types/api";
import { TiposGeneradorTableActions } from "./tipos-generador-table-actions";

export const columns: ColumnDef<TipoGenerador>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => {
      const descripcion = row.getValue<string | null>("descripcion");
      if (!descripcion) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="max-w-[300px] truncate block" title={descripcion}>
          {descripcion}
        </span>
      );
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
    cell: ({ row }) => <TiposGeneradorTableActions tipoGenerador={row.original} />,
  },
];
