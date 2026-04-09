"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useUpdateZona, useDeleteZona } from "@/hooks/use-zonas";
import type { Zona } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ZonaFormDialog } from "./zona-form-dialog";

interface ZonasTableActionsProps {
  zona: Zona;
}

export function ZonasTableActions({ zona }: ZonasTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateZona();
  const deleteMutation = useDeleteZona();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: zona.id,
      data: { activo: !zona.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(zona.id, {
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
            {zona.activo ? "Desactivar" : "Activar"}
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

      <ZonaFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        zona={zona}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar zona"
        description={`¿Está seguro de eliminar la zona "${zona.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
