"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Evento } from "@/types/api";
import { EventosTableActions } from "./eventos-table-actions";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return null;
  const date = new Date(timeStr);
  return date.toLocaleTimeString("es-BO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const eventosColumns: ColumnDef<Evento>[] = [
  {
    accessorKey: "titulo",
    header: "Título",
    cell: ({ row }) => (
      <span className="max-w-[250px] truncate block font-medium" title={row.getValue("titulo")}>
        {row.getValue("titulo")}
      </span>
    ),
  },
  {
    id: "zona",
    header: "Zona",
    cell: ({ row }) => row.original.zona.nombre,
  },
  {
    accessorKey: "fecha_evento",
    header: "Fecha",
    cell: ({ row }) => formatDate(row.getValue("fecha_evento")),
  },
  {
    id: "horario",
    header: "Horario",
    cell: ({ row }) => {
      const inicio = formatTime(row.original.hora_inicio);
      const fin = formatTime(row.original.hora_fin);
      if (!inicio && !fin)
        return <span className="text-muted-foreground">—</span>;
      if (inicio && fin) return `${inicio} - ${fin}`;
      return inicio ?? fin;
    },
  },
  {
    id: "creado_por",
    header: "Creado por",
    cell: ({ row }) => row.original.administrador.nombre_completo,
  },
  {
    id: "acciones",
    header: "",
    cell: ({ row }) => <EventosTableActions evento={row.original} />,
  },
];
