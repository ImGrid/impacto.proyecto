"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Campo de contraseña con el botón del ojo para mostrarla u ocultarla.
 *
 * Existe para no repetir el mismo bloque en cada formulario. Los diálogos de
 * crear recolector, generador y centro operacional pedían la contraseña con un
 * `<Input type="password">` pelado: quien la escribía no tenía forma de
 * comprobar lo que había tecleado, y como es el administrador quien la elige y
 * después se la dicta a la persona, equivocarse significa dejar a alguien sin
 * poder entrar y sin manera de averiguar por qué.
 *
 * Arranca oculta a propósito: mostrarla es una decisión de quien la escribe,
 * no el estado por defecto de la pantalla.
 */
type PasswordInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type"
>;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        // Espacio a la derecha para que el texto no quede debajo del botón.
        className={cn("pr-10", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((prev) => !prev)}
        disabled={props.disabled}
        // Sin `aria-label` el lector de pantalla solo anuncia "botón".
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
