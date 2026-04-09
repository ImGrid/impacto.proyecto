"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Administrador } from "@/types/api";
import { AdministradoresTableActions } from "./administradores-table-actions";

export const columns: ColumnDef<Administrador>[] = [
  {
    accessorKey: "nombre_completo",
    header: "Nombre completo",
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => row.original.usuario.email,
  },
  {
    accessorKey: "telefono",
    header: "Teléfono",
  },
  {
    id: "activo",
    header: "Estado",
    cell: ({ row }) => {
      const activo = row.original.usuario.activo;
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
      <AdministradoresTableActions administrador={row.original} />
    ),
  },
];
