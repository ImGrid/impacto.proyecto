"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Search, TableProperties, Map, X } from "lucide-react";
import { useGeneradores, useGeneradoresMapa } from "@/hooks/use-generadores";
import { useTiposGenerador } from "@/hooks/use-tipos-generador";
import { ESTADO_OPTIONS } from "@/lib/constants";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { GeneradorFormDialog } from "./generador-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

const GeneradoresMapView = dynamic(
  () => import("@/components/shared/generadores-map-view"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[500px] w-full rounded-md" />,
  },
);

export function GeneradoresContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activo, setActivo] = useState<boolean | undefined>(undefined);
  const [tipoGeneradorId, setTipoGeneradorId] = useState<number | undefined>(undefined);

  const { data, isLoading } = useGeneradores({
    page,
    limit: pageSize,
    search,
    activo,
    tipo_generador_id: tipoGeneradorId,
  });

  const { data: generadoresMapaData } = useGeneradoresMapa();

  const { data: tiposGenOpts } = useTiposGenerador({ limit: 100, activo: true });

  const hasFilters = activo !== undefined || tipoGeneradorId !== undefined;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function clearFilters() {
    setActivo(undefined);
    setTipoGeneradorId(undefined);
    setPage(1);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Buscar por razon social..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Crear generador
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
          value={tipoGeneradorId === undefined ? "all" : String(tipoGeneradorId)}
          onValueChange={(value) => {
            setTipoGeneradorId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Tipo de generador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {tiposGenOpts?.data.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.nombre}
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

      <Tabs defaultValue="tabla">
        <TabsList>
          <TabsTrigger value="tabla">
            <TableProperties className="h-4 w-4" />
            Tabla
          </TabsTrigger>
          <TabsTrigger value="mapa">
            <Map className="h-4 w-4" />
            Mapa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tabla">
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
        </TabsContent>

        <TabsContent value="mapa">
          <GeneradoresMapView generadores={generadoresMapaData ?? []} />
        </TabsContent>
      </Tabs>

      <GeneradorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
