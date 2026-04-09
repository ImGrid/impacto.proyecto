"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import {
  useUpdateRecolector,
  useDeleteRecolector,
} from "@/hooks/use-recolectores";
import type { Recolector } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RecolectorFormDialog } from "./recolector-form-dialog";

interface RecolectoresTableActionsProps {
  recolector: Recolector;
}

export function RecolectoresTableActions({
  recolector,
}: RecolectoresTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateRecolector();
  const deleteMutation = useDeleteRecolector();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: recolector.id,
      data: { activo: !recolector.usuario.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(recolector.id, {
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
            {recolector.usuario.activo ? "Desactivar" : "Activar"}
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

      <RecolectorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        recolector={recolector}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar recolector"
        description={`¿Está seguro de eliminar "${recolector.nombre_completo}"? Esta acción eliminará su cuenta de usuario permanentemente.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
