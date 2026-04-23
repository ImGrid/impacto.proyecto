"use client";

import { useState } from "react";
import { Truck, CheckCircle2, X } from "lucide-react";
import { useTransacciones } from "@/hooks/use-transacciones";
import { useZonas } from "@/hooks/use-zonas";
import type { EstadoTransaccion, Transaccion } from "@/types/api";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { makeColumns } from "./columns";
import { TransaccionDetailDialog } from "./transaccion-detail-dialog";
import { TransaccionDeleteDialog } from "./transaccion-delete-dialog";
import { TransaccionEditDialog } from "./transaccion-edit-dialog";
import {
  TransaccionFormDialog,
  type FormMode,
} from "./transaccion-form-dialog";

const estadoOptions = [
  { value: "GENERADO", label: "Generado" },
  { value: "RECOLECTADO", label: "Recolectado" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "PAGADO", label: "Pagado" },
];

export function TransaccionesContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [estado, setEstado] = useState<EstadoTransaccion | undefined>(undefined);
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<FormMode>("recoleccion");
  const [editId, setEditId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaccion | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  function openCreate(mode: FormMode) {
    setCreateMode(mode);
    setCreateOpen(true);
  }

  function openEdit(t: Transaccion) {
    setEditId(t.id);
    setEditOpen(true);
  }

  function openDelete(t: Transaccion) {
    setDeleteTarget(t);
    setDeleteOpen(true);
  }

  const { data, isLoading } = useTransacciones({
    page,
    limit: pageSize,
    estado,
    zona_id: zonaId,
  });

  const { data: zonasOpts } = useZonas({ limit: 100, activo: true });

  const hasFilters = estado !== undefined || zonaId !== undefined;

  function clearFilters() {
    setEstado(undefined);
    setZonaId(undefined);
    setPage(1);
  }

  function handleRowClick(transaccion: Transaccion) {
    setSelectedId(transaccion.id);
    setDetailOpen(true);
  }

  // Columnas con click en la fila para abrir detalle, y botones Editar/Eliminar
  // en la columna Acciones (que tienen stopPropagation).
  const baseColumns = makeColumns({ onEdit: openEdit, onDelete: openDelete });
  const clickableColumns = baseColumns.map((col) => {
    if (col.id === "acciones") return col;
    return {
      ...col,
      cell: (props: any) => (
        <div
          className="cursor-pointer"
          onClick={() => handleRowClick(props.row.original)}
        >
          {typeof col.cell === "function" ? col.cell(props) : null}
        </div>
      ),
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={() => openCreate("recoleccion")} variant="secondary">
          <Truck className="mr-1 h-4 w-4" />
          Registrar recolección
        </Button>
        <Button onClick={() => openCreate("entrega")}>
          <CheckCircle2 className="mr-1 h-4 w-4" />
          Registrar entrega
        </Button>

        <Select
          value={estado ?? "all"}
          onValueChange={(value) => {
            setEstado(
              value === "all" ? undefined : (value as EstadoTransaccion),
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {estadoOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={zonaId === undefined ? "all" : String(zonaId)}
          onValueChange={(value) => {
            setZonaId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Zona" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las zonas</SelectItem>
            {zonasOpts?.data.map((z) => (
              <SelectItem key={z.id} value={String(z.id)}>
                {z.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
      </div>

      <DataTable
        columns={clickableColumns}
        data={data?.data ?? []}
        pageCount={data?.meta.totalPages ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />

      <TransaccionDetailDialog
        transaccionId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={(t) => {
          setDetailOpen(false);
          openEdit(t);
        }}
        onDelete={(t) => {
          setDetailOpen(false);
          openDelete(t);
        }}
      />

      <TransaccionFormDialog
        open={createOpen}
        mode={createMode}
        onOpenChange={setCreateOpen}
      />

      <TransaccionEditDialog
        transaccionId={editId}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <TransaccionDeleteDialog
        transaccion={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  );
}
