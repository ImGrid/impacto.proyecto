"use client";

import { useState } from "react";
import { KeyRound, MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import {
  useUpdateGenerador,
  useDeleteGenerador,
  useResetPasswordGenerador,
} from "@/hooks/use-generadores";
import type { Generador } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ResetPasswordDialog } from "@/components/shared/reset-password-dialog";
import { GeneradorFormDialog } from "./generador-form-dialog";

interface GeneradoresTableActionsProps {
  generador: Generador;
}

export function GeneradoresTableActions({
  generador,
}: GeneradoresTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const updateMutation = useUpdateGenerador();
  const deleteMutation = useDeleteGenerador();
  const resetPasswordMutation = useResetPasswordGenerador();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: generador.id,
      data: { activo: !generador.usuario.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(generador.id, {
      onSuccess: () => setDeleteOpen(false),
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm">
            <MoreHorizontal />
            <span className="sr-only">Acciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
            <KeyRound />
            Restablecer contraseña
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleToggleActivo}>
            <Power />
            {generador.usuario.activo ? "Desactivar" : "Activar"}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <GeneradorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        generador={generador}
      />

      <ResetPasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        nombre={generador.razon_social}
        // El generador inicia sesión con su teléfono de contacto, no con su
        // email ni con un CI. Es la confusión más frecuente al dar soporte.
        identificador={generador.contacto_telefono}
        tipoIdentificador="teléfono"
        isPending={resetPasswordMutation.isPending}
        onConfirm={(password) =>
          resetPasswordMutation.mutate(
            { id: generador.id, password },
            { onSuccess: () => setPasswordOpen(false) },
          )
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar generador"
        description={`¿Está seguro de eliminar "${generador.razon_social}"? Esta acción eliminará su cuenta de usuario permanentemente.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
