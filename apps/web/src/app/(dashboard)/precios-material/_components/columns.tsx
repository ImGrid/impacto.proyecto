"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { PrecioMaterial, EstadoPrecio, UnidadMedida } from "@/types/api";
import { PreciosMaterialTableActions } from "./precios-material-table-actions";

const unidadLabels: Record<UnidadMedida, string> = {
  KG: "Kg",
  UNIDAD: "Unidad",
  BOLSA: "Bolsa",
  TONELADA: "Tonelada",
};

const estadoBadge: Record<
  EstadoPrecio,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  VIGENTE: { label: "Vigente", variant: "default" },
  POR_VENCER: { label: "Por vencer", variant: "outline" },
  VENCIDO: { label: "Vencido", variant: "secondary" },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export const columns: ColumnDef<PrecioMaterial>[] = [
  {
    id: "material",
    header: "Material",
    cell: ({ row }) => row.original.material.nombre,
  },
  {
    accessorKey: "precio_minimo",
    header: "Precio mín. (Bs)",
    cell: ({ row }) => Number(row.getValue("precio_minimo")).toFixed(2),
  },
  {
    accessorKey: "precio_maximo",
    header: "Precio máx. (Bs)",
    cell: ({ row }) => Number(row.getValue("precio_maximo")).toFixed(2),
  },
  {
    id: "unidad",
    header: "Unidad",
    cell: ({ row }) => {
      const u = row.original.material.unidad_medida_default;
      if (!u) return <span className="text-muted-foreground">—</span>;
      return unidadLabels[u];
    },
  },
  {
    accessorKey: "fecha_inicio",
    header: "Desde",
    cell: ({ row }) => formatDate(row.getValue("fecha_inicio")),
  },
  {
    id: "fecha_fin",
    header: "Hasta",
    cell: ({ row }) => {
      const val = row.original.fecha_fin;
      if (!val)
        return (
          <span className="text-muted-foreground italic">Indefinido</span>
        );
      return formatDate(val);
    },
  },
  {
    accessorKey: "estado",
    header: "Estado",
    cell: ({ row }) => {
      const estado = row.getValue<EstadoPrecio>("estado");
      const config = estadoBadge[estado];
      return (
        <Badge
          variant={config.variant}
          className={
            estado === "POR_VENCER"
              ? "border-warning text-warning"
              : undefined
          }
        >
          {config.label}
        </Badge>
      );
    },
  },
  {
    id: "acciones",
    header: "",
    cell: ({ row }) => (
      <PreciosMaterialTableActions precio={row.original} />
    ),
  },
];
