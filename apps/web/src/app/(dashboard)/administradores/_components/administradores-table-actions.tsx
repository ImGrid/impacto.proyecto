"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Power, Trash2 } from "lucide-react";
import {
  useUpdateAdministrador,
  useDeleteAdministrador,
} from "@/hooks/use-administradores";
import type { Administrador } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { AdministradorFormDialog } from "./administrador-form-dialog";

interface AdministradoresTableActionsProps {
  administrador: Administrador;
}

export function AdministradoresTableActions({
  administrador,
}: AdministradoresTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateAdministrador();
  const deleteMutation = useDeleteAdministrador();

  function handleToggleActivo() {
    updateMutation.mutate({
      id: administrador.id,
      data: { activo: !administrador.usuario.activo },
    });
  }

  function handleDelete() {
    deleteMutation.mutate(administrador.id, {
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
            {administrador.usuario.activo ? "Desactivar" : "Activar"}
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

      <AdministradorFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        administrador={administrador}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar administrador"
        description={`¿Está seguro de eliminar a "${administrador.nombre_completo}"? Esta acción eliminará su cuenta de usuario permanentemente.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
