"use client";

import { Package, Truck, CheckCircle2, Banknote, Pencil, Trash2 } from "lucide-react";
import { useTransaccionDetalle } from "@/hooks/use-transacciones";
import type { Transaccion, TransaccionDetalle, TransaccionHistorial } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

const estadoBadgeConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  GENERADO: { label: "Generado", variant: "outline" },
  RECOLECTADO: { label: "Recolectado", variant: "secondary" },
  ENTREGADO: { label: "Entregado", variant: "default" },
  PAGADO: { label: "Pagado", variant: "default" },
};

const rolLabels: Record<string, string> = {
  GENERADOR: "Generador",
  RECOLECTOR: "Recolector",
  ACOPIADOR: "Acopiador",
  ADMIN: "Administrador",
};

const estadoIcons: Record<string, React.ReactNode> = {
  GENERADO: <Package className="h-4 w-4" />,
  RECOLECTADO: <Truck className="h-4 w-4" />,
  ENTREGADO: <CheckCircle2 className="h-4 w-4" />,
  PAGADO: <Banknote className="h-4 w-4" />,
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Arma el texto que identifica al actor de un paso del recorrido,
 * según el rol: nombre completo + dato secundario (CI, email o sucursal).
 * El `identificador` del usuario del historial se usa solo como fallback
 * o para el email del acopiador (que no viene en la entidad acopiador).
 */
function formatActor(
  h: TransaccionHistorial,
  transaccion: TransaccionDetalle,
): string {
  const rol = h.rol_actor;
  if (rol === "RECOLECTOR" && transaccion.recolector) {
    return `${transaccion.recolector.nombre_completo} — CI: ${transaccion.recolector.cedula_identidad}`;
  }
  if (rol === "ACOPIADOR" && transaccion.acopiador) {
    return `${transaccion.acopiador.nombre_completo} — ${h.usuario.identificador}`;
  }
  if (rol === "GENERADOR" && transaccion.sucursal) {
    return `${transaccion.sucursal.generador.razon_social} — ${transaccion.sucursal.nombre}`;
  }
  if (rol === "ADMIN") {
    return `Administrador (${h.usuario.identificador})`;
  }
  // Fallback: si no tenemos la entidad, mostramos al menos rol + identificador.
  return `${rolLabels[rol] ?? rol} (${h.usuario.identificador})`;
}

function formatMaterialesFromDetalles(detalles: Record<string, unknown> | null): string {
  if (!detalles) return "";
  const materiales = detalles.materiales as Array<{
    material_id?: number;
    nombre?: string;
    cantidad?: number;
    unidad_medida?: string;
    precio_unitario?: number;
  }> | undefined;
  if (!materiales || materiales.length === 0) return "";
  return materiales
    .map((m) => {
      let text = `${m.cantidad ?? "?"} ${(m.unidad_medida ?? "").toLowerCase()}`;
      if (m.precio_unitario) text += ` × ${m.precio_unitario} Bs`;
      return text;
    })
    .join(", ");
}

interface TransaccionDetailDialogProps {
  transaccionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (trans: Transaccion) => void;
  onDelete?: (trans: Transaccion) => void;
}

export function TransaccionDetailDialog({
  transaccionId,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: TransaccionDetailDialogProps) {
  const { data: transaccion, isLoading } = useTransaccionDetalle(
    open ? transaccionId : null,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-8">
            <DialogTitle>
              {transaccion ? `Transacción #${transaccion.id}` : "Cargando..."}
            </DialogTitle>
            {transaccion && (onEdit || onDelete) && (
              <div className="flex gap-1">
                {onEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(transaccion)}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onDelete(transaccion)}
                    disabled={transaccion.estado === "PAGADO"}
                    title={
                      transaccion.estado === "PAGADO"
                        ? "No se puede eliminar una entrega pagada"
                        : "Eliminar"
                    }
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Eliminar
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogHeader>

        {isLoading || !transaccion ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Datos generales */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {new Date(transaccion.fecha).toLocaleDateString("es-BO", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Estado</p>
                <Badge
                  variant={
                    estadoBadgeConfig[transaccion.estado]?.variant ?? "outline"
                  }
                >
                  {estadoBadgeConfig[transaccion.estado]?.label ??
                    transaccion.estado}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Recolector</p>
                <p className="font-medium">
                  {transaccion.recolector?.nombre_completo ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Acopiador</p>
                <p className="font-medium">
                  {transaccion.acopiador?.nombre_completo ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Generador / Sucursal</p>
                <p className="font-medium">
                  {transaccion.sucursal
                    ? `${transaccion.sucursal.generador.razon_social} → ${transaccion.sucursal.nombre}`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Zona</p>
                <p className="font-medium">{transaccion.zona.nombre}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Monto total</p>
                <p className="text-lg font-bold">
                  {Number(transaccion.monto_total).toFixed(2)} Bs
                </p>
              </div>
            </div>

            <Separator />

            {/* Materiales finales */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Materiales (datos finales)
              </h3>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">
                        Material
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Cantidad
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Precio
                      </th>
                      <th className="px-3 py-2 text-right font-medium">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {transaccion.detalle_transaccion.map((d) => (
                      <tr key={d.id} className="border-b last:border-0">
                        <td className="px-3 py-2">{d.material.nombre}</td>
                        <td className="px-3 py-2 text-right">
                          {d.cantidad} {d.unidad_medida.toLowerCase()}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {Number(d.precio_unitario) > 0
                            ? `${Number(d.precio_unitario).toFixed(2)} Bs`
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {Number(d.subtotal) > 0
                            ? `${Number(d.subtotal).toFixed(2)} Bs`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Recorrido / Historial */}
            <div>
              <h3 className="mb-2 text-sm font-semibold">
                Recorrido de la transacción
              </h3>
              {transaccion.usuario && (
                <p className="mb-4 text-xs text-muted-foreground">
                  Registrada por {rolLabels[transaccion.usuario.rol] ?? transaccion.usuario.rol} ({transaccion.usuario.identificador})
                </p>
              )}
              <ol className="relative border-l-2 border-muted ml-3">
                {transaccion.transaccion_historial.map(
                  (h: TransaccionHistorial, index: number) => (
                    <li key={h.id} className="mb-8 ml-6 last:mb-0">
                      <span
                        className={`absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background ${
                          index ===
                          transaccion.transaccion_historial.length - 1
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {estadoIcons[h.estado]}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            estadoBadgeConfig[h.estado]?.variant ?? "outline"
                          }
                          className="text-xs"
                        >
                          {estadoBadgeConfig[h.estado]?.label ?? h.estado}
                        </Badge>
                        <span className="text-muted-foreground text-xs">
                          {formatDateTime(h.fecha)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm">
                        <span className="text-muted-foreground">Por:</span>{" "}
                        {formatActor(h, transaccion)}
                      </p>
                      {h.detalles && (
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {formatMaterialesFromDetalles(h.detalles)}
                        </p>
                      )}
                      {h.observaciones && (
                        <p className="mt-0.5 text-sm italic text-muted-foreground">
                          &quot;{h.observaciones}&quot;
                        </p>
                      )}
                    </li>
                  ),
                )}
              </ol>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
