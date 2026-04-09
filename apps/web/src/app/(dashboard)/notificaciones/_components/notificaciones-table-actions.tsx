"use client";

import { useState } from "react";
import { MoreHorizontal, Trash2 } from "lucide-react";
import { useDeleteNotificacion } from "@/hooks/use-notificaciones";
import type { Notificacion } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

interface NotificacionesTableActionsProps {
  notificacion: Notificacion;
}

export function NotificacionesTableActions({
  notificacion,
}: NotificacionesTableActionsProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useDeleteNotificacion();

  function handleDelete() {
    deleteMutation.mutate(notificacion.id, {
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
          <DropdownMenuItem
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar notificación"
        description={`¿Está seguro de eliminar la notificación "${notificacion.titulo}"?`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
