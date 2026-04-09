"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useUpdateGenerador, useDeleteGenerador } from "@/hooks/use-generadores";
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
import { GeneradorFormDialog } from "./generador-form-dialog";

interface GeneradoresTableActionsProps {
  generador: Generador;
}

export function GeneradoresTableActions({
  generador,
}: GeneradoresTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateGenerador();
  const deleteMutation = useDeleteGenerador();

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
