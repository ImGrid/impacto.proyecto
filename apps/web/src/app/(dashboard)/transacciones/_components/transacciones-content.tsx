"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Truck, CheckCircle2, CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransacciones, type TipoDestino } from "@/hooks/use-transacciones";
import { useZonas } from "@/hooks/use-zonas";
import { useDepartamentoActivo } from "@/components/departamento-context";
import { useRecolectores } from "@/hooks/use-recolectores";
import type { EstadoTransaccion, Transaccion } from "@/types/api";
import { DataTable } from "@/components/shared/data-table";
import { SearchableSelect } from "@/components/shared/searchable-select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { TransaccionAdvanceStateDialog } from "./transaccion-advance-state-dialog";
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

const tipoDestinoOptions: { value: TipoDestino; label: string }[] = [
  { value: "centro_op", label: "Centro operacional" },
  { value: "externo", label: "Acopiador/Comprador externo" },
  { value: "desconocido", label: "Desconocido" },
  { value: "sin_asignar", label: "Sin asignar" },
];

export function TransaccionesContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [estado, setEstado] = useState<EstadoTransaccion | undefined>(undefined);
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);
  const [recolectorId, setRecolectorId] = useState<number | undefined>(
    undefined,
  );
  const [tipoDestino, setTipoDestino] = useState<TipoDestino | undefined>(
    undefined,
  );
  const [fechaDesde, setFechaDesde] = useState<Date | undefined>(undefined);
  const [fechaHasta, setFechaHasta] = useState<Date | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<FormMode>("recoleccion");
  const [editId, setEditId] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Transaccion | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState<Transaccion | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);

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

  function openAdvance(t: Transaccion) {
    setAdvanceTarget(t);
    setAdvanceOpen(true);
  }

  const { data, isLoading } = useTransacciones({
    page,
    limit: pageSize,
    estado,
    zona_id: zonaId,
    recolector_id: recolectorId,
    tipo_destino: tipoDestino,
    fecha_desde: fechaDesde ? format(fechaDesde, "yyyy-MM-dd") : undefined,
    fecha_hasta: fechaHasta ? format(fechaHasta, "yyyy-MM-dd") : undefined,
  });

  // Las zonas del filtro se acotan al departamento activo (igual que el filtro
  // de recolectora), para no mostrar zonas de otros departamentos.
  const departamentoActivo = useDepartamentoActivo();
  const { data: zonasOpts } = useZonas({
    limit: 100,
    activo: true,
    departamentoId: departamentoActivo ?? undefined,
  });
  // Las recolectoras ya vienen acotadas al departamento activo por el backend.
  // limit 100 es el máximo que admite PaginationQueryDto (@Max(100)).
  const { data: recolectoresOpts } = useRecolectores({
    limit: 100,
    activo: true,
  });

  const recolectorOptions = (recolectoresOpts?.data ?? []).map((r) => ({
    value: String(r.id),
    label: r.nombre_completo,
  }));

  const zonaOptions = (zonasOpts?.data ?? []).map((z) => ({
    value: String(z.id),
    label: z.nombre,
  }));

  const hasFilters =
    estado !== undefined ||
    zonaId !== undefined ||
    recolectorId !== undefined ||
    tipoDestino !== undefined ||
    fechaDesde !== undefined ||
    fechaHasta !== undefined;

  function clearFilters() {
    setEstado(undefined);
    setZonaId(undefined);
    setRecolectorId(undefined);
    setTipoDestino(undefined);
    setFechaDesde(undefined);
    setFechaHasta(undefined);
    setPage(1);
  }

  function handleRowClick(transaccion: Transaccion) {
    setSelectedId(transaccion.id);
    setDetailOpen(true);
  }

  // Columnas con click en la fila para abrir detalle, y botones Editar/Eliminar
  // en la columna Acciones (que tienen stopPropagation).
  const baseColumns = makeColumns({
    onEdit: openEdit,
    onDelete: openDelete,
    onAdvanceState: openAdvance,
  });
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

        <SearchableSelect
          options={zonaOptions}
          value={zonaId !== undefined ? String(zonaId) : undefined}
          onChange={(v) => {
            setZonaId(v === undefined ? undefined : Number(v));
            setPage(1);
          }}
          placeholder="Zona"
          searchPlaceholder="Buscar zona..."
          allLabel="Todas las zonas"
          emptyText="Sin zonas"
          className="w-[180px]"
        />

        <SearchableSelect
          options={recolectorOptions}
          value={recolectorId !== undefined ? String(recolectorId) : undefined}
          onChange={(v) => {
            setRecolectorId(v === undefined ? undefined : Number(v));
            setPage(1);
          }}
          placeholder="Recolectora"
          searchPlaceholder="Buscar recolectora..."
          allLabel="Todas las recolectoras"
          emptyText="Sin recolectoras"
          className="w-[220px]"
        />

        <Select
          value={tipoDestino ?? "all"}
          onValueChange={(value) => {
            setTipoDestino(
              value === "all" ? undefined : (value as TipoDestino),
            );
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Destino" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los destinos</SelectItem>
            {tipoDestinoOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[150px] justify-start text-left font-normal",
                !fechaDesde && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fechaDesde
                ? format(fechaDesde, "dd MMM yyyy", { locale: es })
                : "Desde"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaDesde}
              onSelect={(d) => {
                setFechaDesde(d);
                setPage(1);
              }}
              locale={es}
              disabled={(d) => (fechaHasta ? d > fechaHasta : d > new Date())}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[150px] justify-start text-left font-normal",
                !fechaHasta && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {fechaHasta
                ? format(fechaHasta, "dd MMM yyyy", { locale: es })
                : "Hasta"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={fechaHasta}
              onSelect={(d) => {
                setFechaHasta(d);
                setPage(1);
              }}
              locale={es}
              disabled={(d) =>
                d > new Date() || (fechaDesde ? d < fechaDesde : false)
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>

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

      <TransaccionAdvanceStateDialog
        transaccion={advanceTarget}
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
        onEditInstead={(t) => {
          setAdvanceOpen(false);
          openEdit(t);
        }}
      />
    </div>
  );
}
