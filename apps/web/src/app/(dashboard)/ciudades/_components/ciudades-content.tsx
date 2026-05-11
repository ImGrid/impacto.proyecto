"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { useCiudades } from "@/hooks/use-ciudades";
import { useDepartamentos } from "@/hooks/use-departamentos";
import { ESTADO_OPTIONS } from "@/lib/constants";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { CiudadFormDialog } from "./ciudad-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CiudadesContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activo, setActivo] = useState<boolean | undefined>(undefined);
  const [departamentoId, setDepartamentoId] = useState<number | undefined>(
    undefined,
  );

  const { data, isLoading } = useCiudades({
    page,
    limit: pageSize,
    search,
    activo,
    departamento_id: departamentoId,
  });

  const { data: departamentosOpts } = useDepartamentos({
    limit: 100,
    activo: true,
  });

  const hasFilters = activo !== undefined || departamentoId !== undefined;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function clearFilters() {
    setActivo(undefined);
    setDepartamentoId(undefined);
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
          Crear ciudad
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={
            departamentoId === undefined ? "all" : String(departamentoId)
          }
          onValueChange={(value) => {
            setDepartamentoId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departamentosOpts?.data.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      <CiudadFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
