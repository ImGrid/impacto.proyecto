"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useDeleteTransaccion } from "@/hooks/use-transacciones";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Confirmación destructiva: el admin debe escribir literalmente
 * "ELIMINAR" para habilitar el botón. Evita eliminaciones accidentales.
 */
const CONFIRM_WORD = "ELIMINAR";

interface TransaccionDeleteDialogProps {
  transaccion: Transaccion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransaccionDeleteDialog({
  transaccion,
  open,
  onOpenChange,
}: TransaccionDeleteDialogProps) {
  const [texto, setTexto] = useState("");
  const deleteMutation = useDeleteTransaccion();

  useEffect(() => {
    if (open) setTexto("");
  }, [open]);

  if (!transaccion) return null;

  const esPagada = transaccion.estado === "PAGADO";
  const puedeConfirmar =
    !esPagada &&
    texto.trim().toUpperCase() === CONFIRM_WORD &&
    !deleteMutation.isPending;

  function handleConfirmar() {
    if (!transaccion) return;
    deleteMutation.mutate(transaccion.id, {
      onSuccess: () => onOpenChange(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar entrega #{transaccion.id}
          </DialogTitle>
          <DialogDescription>
            {esPagada
              ? "Esta entrega ya tiene un pago registrado y no se puede eliminar."
              : "Esta acción no se puede deshacer. La entrega y todo su historial serán eliminados para siempre."}
          </DialogDescription>
        </DialogHeader>

        {!esPagada && (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p className="text-muted-foreground text-xs">Se eliminará:</p>
              <p className="font-medium">
                Entrega #{transaccion.id} — {transaccion.recolector?.nombre_completo ?? "sin recolector"}
              </p>
              <p className="text-xs text-muted-foreground">
                {transaccion.detalle_transaccion
                  ?.map((d) => `${d.material.nombre} ${d.cantidad}${d.unidad_medida.toLowerCase()}`)
                  .join(", ") ?? ""}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirmar-eliminar" className="text-sm">
                Escriba <span className="font-bold">{CONFIRM_WORD}</span> para confirmar
              </Label>
              <Input
                id="confirmar-eliminar"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={CONFIRM_WORD}
                autoComplete="off"
                disabled={deleteMutation.isPending}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Cancelar
          </Button>
          {!esPagada && (
            <Button
              variant="destructive"
              onClick={handleConfirmar}
              disabled={!puedeConfirmar}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar para siempre"
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
