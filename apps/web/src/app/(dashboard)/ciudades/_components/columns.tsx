"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Ciudad } from "@/types/api";
import { CiudadesTableActions } from "./ciudades-table-actions";

export const columns: ColumnDef<Ciudad>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    id: "departamento",
    header: "Departamento",
    cell: ({ row }) => row.original.departamento.nombre,
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
    cell: ({ row }) => <CiudadesTableActions ciudad={row.original} />,
  },
];
