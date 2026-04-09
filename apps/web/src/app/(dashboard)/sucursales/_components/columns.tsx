"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Sucursal } from "@/types/api";
import { SucursalesTableActions } from "./sucursales-table-actions";

const frecuenciaLabels: Record<string, string> = {
  DIARIO: "Diario",
  SEMANAL: "Semanal",
  QUINCENAL: "Quincenal",
  MENSUAL: "Mensual",
  BAJO_DEMANDA: "Bajo demanda",
};

export const columns: ColumnDef<Sucursal>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    id: "generador",
    header: "Generador",
    cell: ({ row }) => row.original.generador.razon_social,
  },
  {
    id: "zona",
    header: "Zona",
    cell: ({ row }) => row.original.zona.nombre,
  },
  {
    id: "frecuencia",
    header: "Frecuencia",
    cell: ({ row }) => {
      const frecuencia = row.original.frecuencia;
      if (!frecuencia) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant="outline">
          {frecuenciaLabels[frecuencia] ?? frecuencia}
        </Badge>
      );
    },
  },
  {
    id: "materiales",
    header: "Materiales",
    cell: ({ row }) => {
      const count = row.original.sucursal_material.length;
      if (count === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <Badge variant="secondary">
          {count} {count === 1 ? "material" : "materiales"}
        </Badge>
      );
    },
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
    cell: ({ row }) => <SucursalesTableActions sucursal={row.original} />,
  },
];
