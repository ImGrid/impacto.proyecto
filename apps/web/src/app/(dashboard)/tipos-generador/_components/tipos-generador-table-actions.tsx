"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import {
  useUpdateTipoGenerador,
  useDeleteTipoGenerador,
} from "@/hooks/use-tipos-generador";
import type { TipoGenerador } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TipoGeneradorFormDialog } from "./tipo-generador-form-dialog";

interface TiposGeneradorTableActionsProps {
  tipoGenerador: TipoGenerador;
}

export function TiposGeneradorTableActions({
  tipoGenerador,
}: TiposGeneradorTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateTipoGenerador();
  const deleteMutation = useDeleteTipoGenerador();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: tipoGenerador.id,
      data: { activo: !tipoGenerador.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(tipoGenerador.id, {
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
            {tipoGenerador.activo ? "Desactivar" : "Activar"}
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

      <TipoGeneradorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        tipoGenerador={tipoGenerador}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar tipo de generador"
        description={`¿Está seguro de eliminar "${tipoGenerador.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
