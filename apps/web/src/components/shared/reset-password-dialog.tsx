"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/password-input";

const MINIMO = 8;

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nombre de la persona o entidad, para que se vea a quién se le cambia. */
  nombre: string;
  /** Con qué inicia sesión: su cédula, su teléfono o su email. */
  identificador: string;
  /** Cómo se llama ese dato, para nombrarlo bien en pantalla. */
  tipoIdentificador: "cédula" | "teléfono" | "email";
  isPending: boolean;
  onConfirm: (password: string) => void;
}

/**
 * Diálogo con el que un administrador le asigna una contraseña nueva a un
 * recolector, generador o centro operacional.
 *
 * Es el único camino de recuperación que existe en el sistema: no hay
 * "olvidé mi contraseña" por correo, y no podría haberlo, porque la mayoría de
 * estos usuarios no tiene un email registrado.
 *
 * Por eso la pantalla insiste en dos cosas:
 *   - la contraseña se puede VER mientras se escribe, porque el administrador
 *     tiene que dictársela después a la persona;
 *   - se recuerda con qué dato inicia sesión, que no es el mismo para cada rol
 *     (cédula, teléfono o email) y es la duda más habitual al dar soporte.
 */
export function ResetPasswordDialog({
  open,
  onOpenChange,
  nombre,
  identificador,
  tipoIdentificador,
  isPending,
  onConfirm,
}: ResetPasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            Se le asignará una contraseña nueva a {nombre}. Anótela antes de
            guardar: después no se puede volver a ver.
          </DialogDescription>
        </DialogHeader>

        {/*
          El formulario vive en un componente aparte y solo se monta con el
          diálogo abierto. Así la contraseña tecleada desaparece sola al
          cerrar, sin necesidad de un efecto que limpie el estado.
        */}
        <FormularioPassword
          identificador={identificador}
          tipoIdentificador={tipoIdentificador}
          isPending={isPending}
          onCancel={() => onOpenChange(false)}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormularioPassword({
  identificador,
  tipoIdentificador,
  isPending,
  onCancel,
  onConfirm,
}: {
  identificador: string;
  tipoIdentificador: "cédula" | "teléfono" | "email";
  isPending: boolean;
  onCancel: () => void;
  onConfirm: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (password.trim().length < MINIMO) {
      setError(`La contraseña debe tener al menos ${MINIMO} caracteres`);
      return;
    }
    setError(null);
    onConfirm(password);
  }

  return (
    <>
      <div className="space-y-4">
        <div className="rounded-md bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            Inicia sesión con su {tipoIdentificador}:
          </span>{" "}
          <span className="font-medium">{identificador || "—"}</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nueva-password">Contraseña nueva</Label>
          <PasswordInput
            id="nueva-password"
            autoComplete="new-password"
            placeholder={`Mínimo ${MINIMO} caracteres`}
            value={password}
            disabled={isPending}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isPending) handleConfirm();
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <p className="text-sm text-muted-foreground">
          Al guardar se cerrarán todas las sesiones que tenga abiertas y tendrá
          que entrar de nuevo con esta contraseña.
        </p>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={handleConfirm} disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar contraseña"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
