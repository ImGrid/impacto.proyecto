"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Sucursal } from "@/types/api";
import { SucursalesTableActions } from "./sucursales-table-actions";

const diaLabels: Record<string, string> = {
  LUNES: "Lun",
  MARTES: "Mar",
  MIERCOLES: "Mié",
  JUEVES: "Jue",
  VIERNES: "Vie",
  SABADO: "Sáb",
  DOMINGO: "Dom",
};

function formatTime(isoTime: string): string {
  // El backend retorna "1970-01-01T08:00:00.000Z", extraemos HH:mm
  const date = new Date(isoTime);
  return date.toISOString().substring(11, 16);
}

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
    id: "horarios",
    header: "Horarios",
    cell: ({ row }) => {
      const horarios = row.original.sucursal_horario;
      if (!horarios || horarios.length === 0) {
        return <span className="text-muted-foreground">—</span>;
      }
      return (
        <div className="flex flex-wrap gap-1">
          {horarios.map((h) => (
            <Badge key={h.id} variant="outline" className="text-xs">
              {diaLabels[h.dia_semana]} {formatTime(h.hora_inicio)}-{formatTime(h.hora_fin)}
            </Badge>
          ))}
        </div>
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
