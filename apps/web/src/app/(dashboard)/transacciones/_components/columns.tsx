"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, CheckCircle2, Undo2 } from "lucide-react";
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
  // Cambia el estado desde la fila: "Entregar" (RECOLECTADO→ENTREGADO) o
  // "Volver a recolectada" (ENTREGADO→RECOLECTADO). El diálogo decide cuál
  // según el estado actual de la transacción.
  onAdvanceState: (trans: Transaccion) => void;
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
      cell: ({ row }) => {
        const nombre = row.original.recolector?.nombre_completo;
        return nombre ? (
          <span className="block max-w-[150px] truncate" title={nombre}>
            {nombre}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "destino",
      header: "Destino",
      cell: ({ row }) => {
        const t = row.original;
        // Destino polimórfico. Máximo uno marcado por CHECK constraint en BD.
        // Se acota el ancho (truncate + tooltip nativo) para que la tabla no
        // crezca a lo ancho con nombres largos de centros/externos.
        if (t.centro_operacional) {
          return (
            <div className="max-w-[180px]">
              <span
                className="block truncate text-sm"
                title={t.centro_operacional.nombre_completo}
              >
                {t.centro_operacional.nombre_completo}
              </span>
              <span className="text-muted-foreground text-xs">
                {t.centro_operacional.nombre_punto}
              </span>
            </div>
          );
        }
        if (t.acopiador_comprador_externo) {
          return (
            <div className="max-w-[180px]">
              <span
                className="block truncate text-sm"
                title={t.acopiador_comprador_externo.nombre}
              >
                {t.acopiador_comprador_externo.nombre}
              </span>
              <span className="text-muted-foreground text-xs">Externo</span>
            </div>
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
      id: "materiales",
      header: "Materiales",
      cell: ({ row }) => {
        const txt = formatMateriales(row.original.detalle_transaccion);
        return (
          <span
            className="block max-w-[150px] truncate text-sm"
            title={txt}
          >
            {txt}
          </span>
        );
      },
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
            {trans.estado === "RECOLECTADO" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                onClick={(e) => {
                  e.stopPropagation();
                  options.onAdvanceState(trans);
                }}
                aria-label="Entregar"
                title="Marcar como entregada"
              >
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
            {trans.estado === "ENTREGADO" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  options.onAdvanceState(trans);
                }}
                aria-label="Volver a recolectada"
                title="Volver a recolectada"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            )}
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
  onAdvanceState: () => {},
});
