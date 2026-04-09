"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useUpdateAcopiador, useDeleteAcopiador } from "@/hooks/use-acopiadores";
import type { Acopiador } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AcopiadorFormDialog } from "./acopiador-form-dialog";

interface AcopiadoresTableActionsProps {
  acopiador: Acopiador;
}

export function AcopiadoresTableActions({
  acopiador,
}: AcopiadoresTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateAcopiador();
  const deleteMutation = useDeleteAcopiador();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: acopiador.id,
      data: { activo: !acopiador.usuario.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(acopiador.id, {
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
            {acopiador.usuario.activo ? "Desactivar" : "Activar"}
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

      <AcopiadorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        acopiador={acopiador}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar acopiador"
        description={`¿Está seguro de eliminar "${acopiador.nombre_completo}"? Esta acción eliminará su cuenta de usuario permanentemente.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
