"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import { useUpdateExterno, useDeleteExterno } from "@/hooks/use-externos";
import type { AcopiadorCompradorExterno } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ExternoFormDialog } from "./externo-form-dialog";

interface ExternosTableActionsProps {
  externo: AcopiadorCompradorExterno;
}

export function ExternosTableActions({
  externo,
}: ExternosTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateExterno();
  const deleteMutation = useDeleteExterno();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: externo.id,
      data: { activo: !externo.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(externo.id, {
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
            {externo.activo ? "Desactivar" : "Activar"}
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

      <ExternoFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        externo={externo}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar acopiador externo"
        description={
          `¿Está seguro de eliminar "${externo.nombre}"? ` +
          `Solo se puede eliminar si no tiene transacciones asociadas. ` +
          `Si las tiene, desactívelo en su lugar.`
        }
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
