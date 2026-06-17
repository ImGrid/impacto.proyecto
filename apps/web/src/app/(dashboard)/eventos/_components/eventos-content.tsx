"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useEventos } from "@/hooks/use-eventos";
import { useZonas } from "@/hooks/use-zonas";
import { useDepartamentoActivo } from "@/components/departamento-context";
import { eventosColumns } from "./eventos-columns";
import { DataTable } from "@/components/shared/data-table";
import { EventoFormDialog } from "./evento-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/shared/searchable-select";

export function EventosContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);

  const { data, isLoading } = useEventos({
    page,
    limit: pageSize,
    search,
    zona_id: zonaId,
  });

  const departamentoActivo = useDepartamentoActivo();
  const { data: zonasOpts } = useZonas({
    limit: 100,
    activo: true,
    departamentoId: departamentoActivo ?? undefined,
  });

  const zonaOptions = (zonasOpts?.data ?? []).map((z) => ({
    value: String(z.id),
    label: z.nombre,
  }));

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar evento..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

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

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Crear evento
        </Button>
      </div>

      <DataTable
        columns={eventosColumns}
        data={data?.data ?? []}
        pageCount={data?.meta.totalPages ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />

      <EventoFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
