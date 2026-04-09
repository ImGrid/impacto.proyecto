"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Search, TableProperties, Map, X } from "lucide-react";
import { useAcopiadores, useAcopiadoresMapa } from "@/hooks/use-acopiadores";
import { useZonas } from "@/hooks/use-zonas";
import { ESTADO_OPTIONS, TIPO_ACOPIO_OPTIONS } from "@/lib/constants";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { AcopiadorFormDialog } from "./acopiador-form-dialog";
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

const AcopiadoresMapView = dynamic(
  () => import("@/components/shared/acopiadores-map-view"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[500px] w-full rounded-md" />,
  },
);

export function AcopiadoresContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activo, setActivo] = useState<boolean | undefined>(undefined);
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);
  const [tipoAcopio, setTipoAcopio] = useState<string | undefined>(undefined);

  const { data, isLoading } = useAcopiadores({
    page,
    limit: pageSize,
    search,
    activo,
    zona_id: zonaId,
    tipo_acopio: tipoAcopio,
  });

  const { data: acopiadoresMapaData } = useAcopiadoresMapa();

  const { data: zonasOpts } = useZonas({ limit: 100, activo: true });

  const hasFilters =
    activo !== undefined ||
    zonaId !== undefined ||
    tipoAcopio !== undefined;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function clearFilters() {
    setActivo(undefined);
    setZonaId(undefined);
    setTipoAcopio(undefined);
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
          Crear acopiador
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
          value={tipoAcopio ?? "all"}
          onValueChange={(value) => {
            setTipoAcopio(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TIPO_ACOPIO_OPTIONS.map((opt) => (
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
          <AcopiadoresMapView acopiadores={acopiadoresMapaData ?? []} />
        </TabsContent>
      </Tabs>

      <AcopiadorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
