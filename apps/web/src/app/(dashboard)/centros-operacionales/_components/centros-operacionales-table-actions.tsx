"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import {
  useUpdateCentroOperacional,
  useDeleteCentroOperacional,
} from "@/hooks/use-centros-operacionales";
import type { CentroOperacional } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { CentroOperacionalFormDialog } from "./centro-operacional-form-dialog";

interface CentrosOperacionalesTableActionsProps {
  centro: CentroOperacional;
}

export function CentrosOperacionalesTableActions({
  centro,
}: CentrosOperacionalesTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateCentroOperacional();
  const deleteMutation = useDeleteCentroOperacional();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: centro.id,
      data: { activo: !centro.usuario.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(centro.id, {
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
            {centro.usuario.activo ? "Desactivar" : "Activar"}
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

      <CentroOperacionalFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        centro={centro}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar centro operacional"
        description={`¿Está seguro de eliminar "${centro.nombre_completo}"? Esta acción eliminará su cuenta de usuario permanentemente.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
