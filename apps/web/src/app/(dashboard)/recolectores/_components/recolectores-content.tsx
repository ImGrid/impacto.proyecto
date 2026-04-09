"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Search, TableProperties, Map, X } from "lucide-react";
import { useRecolectores, useRecolectoresMapa } from "@/hooks/use-recolectores";
import { useZonas } from "@/hooks/use-zonas";
import { useAcopiadores } from "@/hooks/use-acopiadores";
import { useAsociaciones } from "@/hooks/use-asociaciones";
import { useMateriales } from "@/hooks/use-materiales";
import {
  ESTADO_OPTIONS,
  GENERO_OPTIONS,
  TRABAJA_INDIVIDUAL_OPTIONS,
} from "@/lib/constants";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { RecolectorFormDialog } from "./recolector-form-dialog";
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

const RecolectoresMapView = dynamic(
  () => import("@/components/shared/recolectores-map-view"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[500px] w-full rounded-md" />,
  },
);

export function RecolectoresContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activo, setActivo] = useState<boolean | undefined>(undefined);
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);
  const [acopiadorId, setAcopiadorId] = useState<number | undefined>(undefined);
  const [asociacionId, setAsociacionId] = useState<number | undefined>(undefined);
  const [genero, setGenero] = useState<string | undefined>(undefined);
  const [trabajaIndividual, setTrabajaIndividual] = useState<boolean | undefined>(undefined);
  const [materialId, setMaterialId] = useState<number | undefined>(undefined);

  const { data, isLoading } = useRecolectores({
    page,
    limit: pageSize,
    search,
    activo,
    zona_id: zonaId,
    acopiador_id: acopiadorId,
    asociacion_id: asociacionId,
    genero,
    trabaja_individual: trabajaIndividual,
    material_id: materialId,
  });

  const { data: recolectoresMapaData } = useRecolectoresMapa();

  const { data: zonasOpts } = useZonas({ limit: 100, activo: true });
  const { data: acopiadoresOpts } = useAcopiadores({ limit: 100, activo: true });
  const { data: asociacionesOpts } = useAsociaciones({ limit: 100, activo: true });
  const { data: materialesOpts } = useMateriales({ limit: 100, activo: true });

  const hasFilters =
    activo !== undefined ||
    zonaId !== undefined ||
    acopiadorId !== undefined ||
    asociacionId !== undefined ||
    genero !== undefined ||
    trabajaIndividual !== undefined ||
    materialId !== undefined;

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value);
    setPage(1);
  }

  function clearFilters() {
    setActivo(undefined);
    setZonaId(undefined);
    setAcopiadorId(undefined);
    setAsociacionId(undefined);
    setGenero(undefined);
    setTrabajaIndividual(undefined);
    setMaterialId(undefined);
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
          Crear recolector
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
          value={acopiadorId === undefined ? "all" : String(acopiadorId)}
          onValueChange={(value) => {
            setAcopiadorId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Acopiador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los acopiadores</SelectItem>
            {acopiadoresOpts?.data.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.nombre_completo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={asociacionId === undefined ? "all" : String(asociacionId)}
          onValueChange={(value) => {
            setAsociacionId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Asociación" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las asociaciones</SelectItem>
            {asociacionesOpts?.data.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={genero ?? "all"}
          onValueChange={(value) => {
            setGenero(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Género" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {GENERO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={trabajaIndividual === undefined ? "all" : String(trabajaIndividual)}
          onValueChange={(value) => {
            setTrabajaIndividual(value === "all" ? undefined : value === "true");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Individual" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TRABAJA_INDIVIDUAL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={materialId === undefined ? "all" : String(materialId)}
          onValueChange={(value) => {
            setMaterialId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los materiales</SelectItem>
            {materialesOpts?.data.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.nombre}
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
          <RecolectoresMapView recolectores={recolectoresMapaData ?? []} />
        </TabsContent>
      </Tabs>

      <RecolectorFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
