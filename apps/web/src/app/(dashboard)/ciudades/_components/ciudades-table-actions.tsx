"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useUpdateCiudad, useDeleteCiudad } from "@/hooks/use-ciudades";
import type { Ciudad } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CiudadFormDialog } from "./ciudad-form-dialog";

interface CiudadesTableActionsProps {
  ciudad: Ciudad;
}

export function CiudadesTableActions({ ciudad }: CiudadesTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateCiudad();
  const deleteMutation = useDeleteCiudad();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: ciudad.id,
      data: { activo: !ciudad.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(ciudad.id, {
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
            {ciudad.activo ? "Desactivar" : "Activar"}
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

      <CiudadFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ciudad={ciudad}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar ciudad"
        description={
          `¿Está seguro de eliminar "${ciudad.nombre}"? ` +
          `Solo se puede eliminar si no tiene zonas asociadas. ` +
          `Si tiene zonas, desactívela en su lugar.`
        }
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
