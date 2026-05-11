"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { CentroOperacional } from "@/types/api";
import { CentrosOperacionalesTableActions } from "./centros-operacionales-table-actions";

export const columns: ColumnDef<CentroOperacional>[] = [
  {
    accessorKey: "nombre_completo",
    header: "Nombre",
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => row.original.usuario.email,
  },
  {
    id: "tipo_acopio",
    header: "Tipo",
    cell: ({ row }) => {
      const tipo = row.original.tipo_acopio;
      return (
        <Badge variant={tipo === "FIJO" ? "default" : "outline"}>
          {tipo === "FIJO" ? "Fijo" : "Móvil"}
        </Badge>
      );
    },
  },
  {
    id: "zona",
    header: "Zona",
    cell: ({ row }) => row.original.zona.nombre,
  },
  {
    id: "departamento",
    header: "Departamento",
    cell: ({ row }) => row.original.departamento.nombre,
  },
  {
    accessorKey: "celular",
    header: "Celular",
  },
  {
    id: "ubicacion",
    header: "Ubicación",
    cell: ({ row }) => {
      const { latitud, longitud } = row.original;
      if (latitud == null || longitud == null) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <span className="flex items-center gap-1 text-xs">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          Sí
        </span>
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
    cell: ({ row }) => (
      <CentrosOperacionalesTableActions centro={row.original} />
    ),
  },
];
