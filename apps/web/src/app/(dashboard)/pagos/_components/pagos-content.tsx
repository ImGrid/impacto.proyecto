"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { usePagos } from "@/hooks/use-pagos";
import type { Pago } from "@/types/api";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { columns } from "./columns";
import { PagoDetailDialog } from "./pago-detail-dialog";

export function PagosContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data, isLoading } = usePagos({
    page,
    limit: pageSize,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
  });

  const hasFilters = fechaDesde !== "" || fechaHasta !== "";

  function clearFilters() {
    setFechaDesde("");
    setFechaHasta("");
    setPage(1);
  }

  function handleRowClick(pago: Pago) {
    setSelectedId(pago.id);
    setDetailOpen(true);
  }

  const clickableColumns = columns.map((col) => ({
    ...col,
    cell: (props: any) => (
      <div
        className="cursor-pointer"
        onClick={() => handleRowClick(props.row.original)}
      >
        {typeof col.cell === "function" ? col.cell(props) : null}
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Desde:</span>
          <Input
            type="date"
            value={fechaDesde}
            onChange={(e) => {
              setFechaDesde(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Hasta:</span>
          <Input
            type="date"
            value={fechaHasta}
            onChange={(e) => {
              setFechaHasta(e.target.value);
              setPage(1);
            }}
            className="w-[160px]"
          />
        </div>

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

      <PagoDetailDialog
        pagoId={selectedId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
