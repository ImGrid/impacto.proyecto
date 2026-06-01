"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { fotoSrc } from "@/lib/utils";
import type { Recolector } from "@/types/api";
import { RecolectoresTableActions } from "./recolectores-table-actions";

// Iniciales (máx 2) para el fallback del avatar cuando no hay foto.
function iniciales(nombre: string): string {
  return (
    nombre
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

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
    cell: ({ row }) => {
      const r = row.original;
      const src = fotoSrc(r.foto_url);
      return (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            {src ? <AvatarImage src={src} alt={r.nombre_completo} /> : null}
            <AvatarFallback className="text-[10px]">
              {iniciales(r.nombre_completo)}
            </AvatarFallback>
          </Avatar>
          <span>{r.nombre_completo}</span>
        </div>
      );
    },
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => row.original.usuario.email || "—",
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
