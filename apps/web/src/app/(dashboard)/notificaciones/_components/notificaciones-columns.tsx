"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Notificacion } from "@/types/api";
import { NotificacionesTableActions } from "./notificaciones-table-actions";

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDestinatarioLabel(notif: Notificacion) {
  if (notif.receptor) return notif.receptor.email;
  if (notif.zona) return `Zona: ${notif.zona.nombre}`;
  return "Todas las recolectoras";
}

export const notificacionesColumns: ColumnDef<Notificacion>[] = [
  {
    accessorKey: "titulo",
    header: "Título",
    cell: ({ row }) => (
      <span
        className="max-w-[200px] truncate block font-medium"
        title={row.getValue("titulo")}
      >
        {row.getValue("titulo")}
      </span>
    ),
  },
  {
    id: "destinatario",
    header: "Destinatario",
    cell: ({ row }) => {
      const label = getDestinatarioLabel(row.original);
      const isIndividual = !!row.original.receptor;
      return (
        <span className={isIndividual ? "" : "text-muted-foreground italic"}>
          {label}
        </span>
      );
    },
  },
  {
    accessorKey: "tipo",
    header: "Tipo",
    cell: ({ row }) => {
      const tipo = row.getValue<string>("tipo");
      const label = tipo === "SISTEMA" ? "Individual" : "General";
      return (
        <Badge variant={tipo === "SISTEMA" ? "outline" : "secondary"}>
          {label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "fecha_creacion",
    header: "Enviada",
    cell: ({ row }) => formatDateTime(row.getValue("fecha_creacion")),
  },
  {
    id: "acciones",
    header: "",
    cell: ({ row }) => (
      <NotificacionesTableActions notificacion={row.original} />
    ),
  },
];
