"use client";

import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useDeletePrecioMaterial } from "@/hooks/use-precios-material";
import type { PrecioMaterial } from "@/types/api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PrecioMaterialFormDialog } from "./precio-material-form-dialog";

interface PreciosMaterialTableActionsProps {
  precio: PrecioMaterial;
}

export function PreciosMaterialTableActions({
  precio,
}: PreciosMaterialTableActionsProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deleteMutation = useDeletePrecioMaterial();

  const isVencido = precio.estado === "VENCIDO";

  function handleDelete() {
    deleteMutation.mutate(precio.id, {
      onSuccess: () => setDeleteOpen(false),
    });
  }

  if (isVencido) {
    return null;
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

      <PrecioMaterialFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        precio={precio}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar precio"
        description={`¿Está seguro de eliminar el precio de "${precio.material.nombre}"? Esta acción no se puede deshacer.`}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
