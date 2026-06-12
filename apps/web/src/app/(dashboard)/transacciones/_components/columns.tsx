"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Transaccion } from "@/types/api";
import { formatearFechaSolo } from "@/lib/utils";

const estadoConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  GENERADO: { label: "Generado", variant: "outline" },
  RECOLECTADO: { label: "Recolectado", variant: "secondary" },
  ENTREGADO: { label: "Entregado", variant: "default" },
  PAGADO: { label: "Pagado", variant: "default" },
};

function formatMateriales(detalles: Transaccion["detalle_transaccion"]): string {
  if (!detalles || detalles.length === 0) return "—";
  return detalles
    .map(
      (d) =>
        `${d.material?.nombre ?? d.nombre_personalizado ?? "Otro"} ${d.cantidad}${d.unidad_medida.toLowerCase()}`,
    )
    .join(", ");
}

/**
 * Factory de columnas. Recibe callbacks para editar/eliminar que se
 * ejecutan desde los botones de la columna "Acciones". Los botones
 * detienen la propagación para no disparar el handler de la fila
 * (que abre el detalle).
 */
export function makeColumns(options: {
  onEdit: (trans: Transaccion) => void;
  onDelete: (trans: Transaccion) => void;
}): ColumnDef<Transaccion>[] {
  return [
    {
      accessorKey: "id",
      header: "#",
      cell: ({ row }) => (
        <span className="text-muted-foreground">#{row.original.id}</span>
      ),
    },
    {
      id: "fecha",
      header: "Fecha",
      cell: ({ row }) => formatearFechaSolo(row.original.fecha),
    },
    {
      id: "recolector",
      header: "Recolector",
      cell: ({ row }) =>
        row.original.recolector?.nombre_completo ?? (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "destino",
      header: "Destino",
      cell: ({ row }) => {
        const t = row.original;
        // Destino polimórfico. Máximo uno marcado por CHECK constraint en BD.
        if (t.centro_operacional) {
          return (
            <span className="text-sm">
              {t.centro_operacional.nombre_completo}
              <span className="text-muted-foreground text-xs block">
                {t.centro_operacional.nombre_punto}
              </span>
            </span>
          );
        }
        if (t.acopiador_comprador_externo) {
          return (
            <span className="text-sm">
              {t.acopiador_comprador_externo.nombre}
              <span className="text-muted-foreground text-xs block">
                Externo
              </span>
            </span>
          );
        }
        if (t.destino_desconocido) {
          return (
            <span className="text-muted-foreground text-sm italic">
              Desconocido
            </span>
          );
        }
        return <span className="text-muted-foreground">—</span>;
      },
    },
    {
      id: "zona",
      header: "Zona",
      cell: ({ row }) => row.original.zona.nombre,
    },
    {
      id: "materiales",
      header: "Materiales",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate block text-sm">
          {formatMateriales(row.original.detalle_transaccion)}
        </span>
      ),
    },
    {
      id: "monto",
      header: "Monto",
      cell: ({ row }) => {
        const monto = Number(row.original.monto_total);
        if (monto === 0) return <span className="text-muted-foreground">—</span>;
        return <span className="font-medium">{monto.toFixed(2)} Bs</span>;
      },
    },
    {
      id: "estado",
      header: "Estado",
      cell: ({ row }) => {
        const config = estadoConfig[row.original.estado];
        return (
          <Badge variant={config?.variant ?? "outline"}>
            {config?.label ?? row.original.estado}
          </Badge>
        );
      },
    },
    {
      id: "acciones",
      header: "",
      cell: ({ row }) => {
        const trans = row.original;
        const esPagada = trans.estado === "PAGADO";
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                options.onEdit(trans);
              }}
              aria-label="Editar"
              title="Editar"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                options.onDelete(trans);
              }}
              disabled={esPagada}
              aria-label="Eliminar"
              title={
                esPagada
                  ? "No se puede eliminar una entrega pagada"
                  : "Eliminar"
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];
}

// Compat: export default para rutas que aún no usan la factory.
export const columns = makeColumns({
  onEdit: () => {},
  onDelete: () => {},
});
