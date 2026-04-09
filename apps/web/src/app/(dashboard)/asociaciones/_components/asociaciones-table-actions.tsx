"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import {
  useUpdateAsociacion,
  useDeleteAsociacion,
} from "@/hooks/use-asociaciones";
import type { Asociacion } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AsociacionFormDialog } from "./asociacion-form-dialog";

interface AsociacionesTableActionsProps {
  asociacion: Asociacion;
}

export function AsociacionesTableActions({
  asociacion,
}: AsociacionesTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateAsociacion();
  const deleteMutation = useDeleteAsociacion();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: asociacion.id,
      data: { activo: !asociacion.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(asociacion.id, {
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
            {asociacion.activo ? "Desactivar" : "Activar"}
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

      <AsociacionFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        asociacion={asociacion}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar asociación"
        description={`¿Está seguro de eliminar la asociación "${asociacion.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
