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
  ACOPIADOR: "Centro operacional",
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
  if (rol === "ACOPIADOR" && transaccion.centro_operacional) {
    return `${transaccion.centro_operacional.nombre_completo} — ${h.usuario.identificador}`;
  }
  if (rol === "GENERADOR") {
    // Con multi-sucursal, el paso GENERADO automático puede asociarse a
    // una sucursal específica que viene en `h.detalles.sucursal_id`. Si la
    // encontramos en los detalles de la transacción, mostramos su nombre.
    const sucursalIdMeta = (h.detalles as { sucursal_id?: number } | null)
      ?.sucursal_id;
    if (sucursalIdMeta != null) {
      const det = transaccion.detalle_transaccion.find(
        (d) => d.sucursal_id === sucursalIdMeta,
      );
      if (det?.sucursal) {
        return `${det.sucursal.generador.razon_social} — ${det.sucursal.nombre}`;
      }
    }
    return `Generador (${h.usuario.identificador})`;
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
                <p className="text-muted-foreground">Destino</p>
                <p className="font-medium">
                  {transaccion.centro_operacional ? (
                    <>
                      {transaccion.centro_operacional.nombre_completo}
                      <span className="text-muted-foreground text-xs block font-normal">
                        Centro operacional —{" "}
                        {transaccion.centro_operacional.nombre_punto}
                      </span>
                    </>
                  ) : transaccion.acopiador_comprador_externo ? (
                    <>
                      {transaccion.acopiador_comprador_externo.nombre}
                      <span className="text-muted-foreground text-xs block font-normal">
                        Acopiador/comprador externo
                        {transaccion.acopiador_comprador_externo.asociacion
                          ? ` — ${transaccion.acopiador_comprador_externo.asociacion}`
                          : ""}
                      </span>
                    </>
                  ) : transaccion.destino_desconocido ? (
                    <span className="italic text-muted-foreground">
                      Desconocido
                    </span>
                  ) : (
                    "—"
                  )}
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
                      <th className="px-3 py-2 text-left font-medium">
                        Origen
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
                        <td className="px-3 py-2">
                          {d.sucursal ? (
                            <span>
                              {d.sucursal.nombre}
                              <span className="block text-xs text-muted-foreground">
                                {d.sucursal.generador.razon_social}
                              </span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic">
                              Sin especificar
                            </span>
                          )}
                        </td>
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

            {/* Resumen por sucursal: agrega kg y Bs por cada sucursal
                distinta presente en los detalles. Solo se muestra si hay
                al menos una sucursal asignada (caso multi-origen). */}
            {(() => {
              const resumen = new Map<
                number,
                {
                  nombre: string;
                  generador: string;
                  kg: number;
                  bs: number;
                  unidades: number;
                }
              >();
              for (const d of transaccion.detalle_transaccion) {
                if (!d.sucursal) continue;
                const acc = resumen.get(d.sucursal.id) ?? {
                  nombre: d.sucursal.nombre,
                  generador: d.sucursal.generador.razon_social,
                  kg: 0,
                  bs: 0,
                  unidades: 0,
                };
                if (d.unidad_medida === "KG") {
                  acc.kg += Number(d.cantidad);
                } else {
                  acc.unidades += Number(d.cantidad);
                }
                acc.bs += Number(d.subtotal);
                resumen.set(d.sucursal.id, acc);
              }
              if (resumen.size === 0) return null;
              return (
                <div>
                  <h3 className="mb-3 text-sm font-semibold">
                    Resumen por sucursal de origen
                  </h3>
                  <div className="rounded-md border bg-muted/20 p-3 space-y-2">
                    {Array.from(resumen.values()).map((r, i) => (
                      <div
                        key={i}
                        className="flex items-baseline justify-between text-sm"
                      >
                        <div>
                          <span className="font-medium">{r.nombre}</span>
                          <span className="block text-xs text-muted-foreground">
                            {r.generador}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">
                            {r.kg > 0 ? `${r.kg} kg` : ""}
                            {r.kg > 0 && r.unidades > 0 ? " · " : ""}
                            {r.unidades > 0 ? `${r.unidades} und.` : ""}
                          </span>
                          {r.bs > 0 && (
                            <span className="block text-xs text-muted-foreground">
                              {r.bs.toFixed(2)} Bs
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

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
