"use client";

import { usePagoDetalle } from "@/hooks/use-pagos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-BO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface PagoDetailDialogProps {
  pagoId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PagoDetailDialog({
  pagoId,
  open,
  onOpenChange,
}: PagoDetailDialogProps) {
  const { data: pago, isLoading } = usePagoDetalle(open ? pagoId : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {pago ? `Pago #${pago.id}` : "Cargando..."}
          </DialogTitle>
        </DialogHeader>

        {isLoading || !pago ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Datos del pago */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Fecha de pago</p>
                <p className="font-medium">{formatDate(pago.fecha_pago)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monto total</p>
                <p className="text-lg font-bold">
                  {Number(pago.monto_total).toFixed(2)} Bs
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Recolector</p>
                <p className="font-medium">{pago.recolector.nombre_completo}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Acopiador</p>
                <p className="font-medium">{pago.acopiador.nombre_completo}</p>
              </div>
              {pago.observaciones && (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Observaciones</p>
                  <p className="font-medium">{pago.observaciones}</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Transacciones cubiertas */}
            <div>
              <h3 className="mb-3 text-sm font-semibold">
                Transacciones cubiertas por este pago
              </h3>
              <div className="space-y-3">
                {pago.pago_transaccion.map((pt) => (
                  <div
                    key={pt.transaccion_id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Transacción #{pt.transaccion_id}
                      </span>
                      {pt.transaccion && (
                        <span className="font-medium">
                          {Number(pt.transaccion.monto_total).toFixed(2)} Bs
                        </span>
                      )}
                    </div>
                    {pt.transaccion && (
                      <>
                        <p className="mt-1 text-muted-foreground">
                          {formatDate(pt.transaccion.fecha)}
                        </p>
                        {pt.transaccion.detalle_transaccion && (
                          <p className="mt-1">
                            {pt.transaccion.detalle_transaccion
                              .map(
                                (d) =>
                                  `${d.material.nombre} ${d.cantidad}${d.unidad_medida.toLowerCase()}`,
                              )
                              .join(", ")}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
