"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import type { Material, UnidadMedida } from "@/types/api";
import { MaterialesTableActions } from "./materiales-table-actions";

const unidadLabels: Record<UnidadMedida, string> = {
  KG: "Kg",
  UNIDAD: "Unidad",
  BOLSA: "Bolsa",
  TONELADA: "Tonelada",
};

export const columns: ColumnDef<Material>[] = [
  {
    accessorKey: "nombre",
    header: "Nombre",
  },
  {
    accessorKey: "descripcion",
    header: "Descripción",
    cell: ({ row }) => {
      const val = row.getValue<string | null>("descripcion");
      if (!val) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="max-w-[200px] truncate block" title={val}>
          {val}
        </span>
      );
    },
  },
  {
    accessorKey: "unidad_medida_default",
    header: "Unidad",
    cell: ({ row }) => {
      const val = row.getValue<UnidadMedida | null>("unidad_medida_default");
      if (!val) return <span className="text-muted-foreground">—</span>;
      return unidadLabels[val];
    },
  },
  {
    accessorKey: "factor_co2",
    header: "Factor CO2",
    cell: ({ row }) => {
      const val = row.getValue<number | null>("factor_co2");
      if (val == null) return <span className="text-muted-foreground">—</span>;
      return Number(val).toFixed(4);
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
    cell: ({ row }) => <MaterialesTableActions material={row.original} />,
  },
];
