"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Recolector } from "@/types/api";
import { RecolectoresTableActions } from "./recolectores-table-actions";

const generoLabels: Record<string, string> = {
  HOMBRE: "H",
  MUJER: "M",
  NO_ESPECIFICA: "—",
};

const diaLabels: Record<string, string> = {
  LUNES: "Lun",
  MARTES: "Mar",
  MIERCOLES: "Mié",
  JUEVES: "Jue",
  VIERNES: "Vie",
  SABADO: "Sáb",
  DOMINGO: "Dom",
};

const diaOrder = [
  "LUNES",
  "MARTES",
  "MIERCOLES",
  "JUEVES",
  "VIERNES",
  "SABADO",
  "DOMINGO",
];

export const columns: ColumnDef<Recolector>[] = [
  {
    accessorKey: "nombre_completo",
    header: "Nombre",
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => row.original.usuario.email || "—",
  },
  {
    id: "acopiador",
    header: "Acopiador",
    cell: ({ row }) => row.original.acopiador.nombre_completo,
  },
  {
    id: "zona",
    header: "Zona",
    cell: ({ row }) => row.original.zona.nombre,
  },
  {
    id: "dias",
    header: "Días",
    cell: ({ row }) => {
      const dias = row.original.recolector_dia_trabajo;
      if (dias.length === 0) return <span className="text-muted-foreground">—</span>;
      const sorted = [...dias].sort(
        (a, b) =>
          diaOrder.indexOf(a.dia_semana) - diaOrder.indexOf(b.dia_semana),
      );
      return (
        <span className="text-xs">
          {sorted.map((d) => diaLabels[d.dia_semana] ?? d.dia_semana).join(", ")}
        </span>
      );
    },
  },
  {
    id: "genero_edad",
    header: "Género/Edad",
    cell: ({ row }) => {
      const { genero, edad } = row.original;
      return `${generoLabels[genero] ?? genero} / ${edad}`;
    },
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
    cell: ({ row }) => <RecolectoresTableActions recolector={row.original} />,
  },
];
