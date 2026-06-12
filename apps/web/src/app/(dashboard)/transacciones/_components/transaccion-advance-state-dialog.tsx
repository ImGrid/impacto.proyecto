"use client";

import { Loader2, CheckCircle2, Undo2, AlertTriangle } from "lucide-react";
import { useAvanzarEstadoTransaccion } from "@/hooks/use-transacciones";
import type { Transaccion } from "@/types/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TransaccionAdvanceStateDialogProps {
  transaccion: Transaccion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Abre el diálogo de Editar (para agregar precios o elegir un destino
  // concreto cuando la entrega no está lista para marcarse como entregada).
  onEditInstead: (t: Transaccion) => void;
}

/**
 * Confirmación para cambiar el estado de una entrega desde la tabla:
 * - RECOLECTADO → ENTREGADO ("Entregar"): valida que tenga precios y, si no
 *   tiene destino, ofrece marcarlo como "Desconocido".
 * - ENTREGADO → RECOLECTADO ("Volver a recolectada"): reversa simple. El
 *   backend la bloquea si la entrega ya fue pagada.
 */
export function TransaccionAdvanceStateDialog({
  transaccion,
  open,
  onOpenChange,
  onEditInstead,
}: TransaccionAdvanceStateDialogProps) {
  const mutation = useAvanzarEstadoTransaccion();
  if (!transaccion) return null;

  const esEntregar = transaccion.estado === "RECOLECTADO";

  // ----- Reversa: ENTREGADO → RECOLECTADO -----
  if (!esEntregar) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="h-5 w-5" />
              Volver a recolectada
            </DialogTitle>
            <DialogDescription>
              La entrega #{transaccion.id} volverá al estado “Recolectada”. Su
              destino y sus materiales se conservan; podrá volver a marcarla como
              entregada cuando quiera.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                mutation.mutate(
                  { id: transaccion.id, estado: "RECOLECTADO" },
                  { onSuccess: () => onOpenChange(false) },
                )
              }
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Volver a recolectada"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // ----- Entregar: RECOLECTADO → ENTREGADO -----
  const sinPrecio = transaccion.detalle_transaccion.some(
    (d) => !(Number(d.precio_unitario) > 0),
  );
  const destinoNombre = transaccion.centro_operacional
    ? transaccion.centro_operacional.nombre_completo
    : transaccion.acopiador_comprador_externo
      ? transaccion.acopiador_comprador_externo.nombre
      : transaccion.destino_desconocido
        ? "Desconocido"
        : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            Marcar como entregada
          </DialogTitle>
          <DialogDescription>
            Entrega #{transaccion.id} —{" "}
            {transaccion.recolector?.nombre_completo ?? "sin recolector"}
          </DialogDescription>
        </DialogHeader>

        {sinPrecio ? (
          // Falta precio: una entrega necesita el precio de cada material.
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                Esta entrega tiene materiales sin precio. Una entrega necesita el
                precio de cada material. Agréguelos antes de entregar.
              </span>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button onClick={() => onEditInstead(transaccion)}>
                Agregar precios
              </Button>
            </DialogFooter>
          </div>
        ) : destinoNombre != null ? (
          // Lista: tiene precios y destino.
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground text-xs">Destino</p>
              <p className="font-medium">{destinoNombre}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              ¿Confirma que esta entrega ya salió hacia ese destino?
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={mutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  mutation.mutate(
                    { id: transaccion.id, estado: "ENTREGADO" },
                    { onSuccess: () => onOpenChange(false) },
                  )
                }
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Confirmar entrega"
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Sin destino: ofrecer "Desconocido" (opción B) o ir a Editar a elegir.
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>
                Esta entrega no tiene un destino final. Si continúa, se marcará el
                destino como <strong>Desconocido</strong>.
              </span>
            </div>
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => onEditInstead(transaccion)}
                disabled={mutation.isPending}
              >
                Elegir destino
              </Button>
              <Button
                onClick={() =>
                  mutation.mutate(
                    {
                      id: transaccion.id,
                      estado: "ENTREGADO",
                      marcarDesconocido: true,
                    },
                    { onSuccess: () => onOpenChange(false) },
                  )
                }
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Entregar como Desconocido"
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
