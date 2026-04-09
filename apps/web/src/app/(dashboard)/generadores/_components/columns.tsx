"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Generador } from "@/types/api";
import { GeneradoresTableActions } from "./generadores-table-actions";

export const columns: ColumnDef<Generador>[] = [
  {
    accessorKey: "razon_social",
    header: "Razon social",
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => row.original.usuario.email,
  },
  {
    id: "tipo_generador",
    header: "Tipo",
    cell: ({ row }) => row.original.tipo_generador.nombre,
  },
  {
    accessorKey: "contacto_nombre",
    header: "Contacto",
  },
  {
    accessorKey: "contacto_telefono",
    header: "Telefono",
  },
  {
    id: "ubicacion",
    header: "Ubicacion",
    cell: ({ row }) => {
      const gen = row.original;
      if (gen.latitud == null || gen.longitud == null) {
        return <span className="text-muted-foreground text-xs">Sin ubicacion</span>;
      }
      return (
        <MapPin className="h-4 w-4 text-primary" />
      );
    },
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
    cell: ({ row }) => <GeneradoresTableActions generador={row.original} />,
  },
];
