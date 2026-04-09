"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useSucursales } from "@/hooks/use-sucursales";
import { useZonas } from "@/hooks/use-zonas";
import { useGeneradores } from "@/hooks/use-generadores";
import { ESTADO_OPTIONS, FRECUENCIA_OPTIONS } from "@/lib/constants";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { SucursalFormDialog } from "./sucursal-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SucursalesContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activo, setActivo] = useState<boolean | undefined>(undefined);
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);
  const [frecuencia, setFrecuencia] = useState<string | undefined>(undefined);
  const [generadorId, setGeneradorId] = useState<number | undefined>(undefined);

  const { data, isLoading } = useSucursales({
    page,
    limit: pageSize,
    search,
    activo,
    zona_id: zonaId,
    frecuencia,
    generador_id: generadorId,
  });

  const { data: zonasOpts } = useZonas({ limit: 100, activo: true });
  const { data: generadoresOpts } = useGeneradores({ limit: 100, activo: true });

  const hasFilters =
    activo !== undefined ||
    zonaId !== undefined ||
    frecuencia !== undefined ||
    generadorId !== undefined;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function clearFilters() {
    setActivo(undefined);
    setZonaId(undefined);
    setFrecuencia(undefined);
    setGeneradorId(undefined);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Crear sucursal
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={activo === undefined ? "all" : String(activo)}
          onValueChange={(value) => {
            setActivo(value === "all" ? undefined : value === "true");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ESTADO_OPTIONS.map((opt) => (
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

        <Select
          value={frecuencia ?? "all"}
          onValueChange={(value) => {
            setFrecuencia(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Frecuencia" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {FRECUENCIA_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={generadorId === undefined ? "all" : String(generadorId)}
          onValueChange={(value) => {
            setGeneradorId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Generador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los generadores</SelectItem>
            {generadoresOpts?.data.map((g) => (
              <SelectItem key={g.id} value={String(g.id)}>
                {g.razon_social}
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
        columns={columns}
        data={data?.data ?? []}
        pageCount={data?.meta.totalPages ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />

      <SucursalFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
