"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Zona } from "@/types/api";
import { ZonasTableActions } from "./zonas-table-actions";

export const columns: ColumnDef<Zona>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    accessorKey: "descripcion",
    header: "Descripcion",
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
    id: "ubicacion",
    header: "Ubicacion",
    cell: ({ row }) => {
      const zona = row.original;
      if (zona.latitud == null || zona.longitud == null) {
        return <span className="text-muted-foreground text-xs">Sin ubicacion</span>;
      }
      return (
        <div className="flex items-center gap-1.5 text-xs">
          <MapPin className="h-3.5 w-3.5 text-primary" />
          <span>{zona.radio_km ? `${zona.radio_km} km` : "—"}</span>
        </div>
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
    cell: ({ row }) => <ZonasTableActions zona={row.original} />,
  },
];
