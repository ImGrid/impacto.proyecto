"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Plus, Search, TableProperties, Map } from "lucide-react";
import { useZonas, useZonasMapa } from "@/hooks/use-zonas";
import { ESTADO_OPTIONS } from "@/lib/constants";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { ZonaFormDialog } from "./zona-form-dialog";
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

const ZonasMapView = dynamic(
  () => import("@/components/shared/zonas-map-view"),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[500px] w-full rounded-md" />,
  },
);

export function ZonasContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [activo, setActivo] = useState<boolean | undefined>(undefined);

  const { data, isLoading } = useZonas({ page, limit: pageSize, search, activo });

  const { data: zonasMapaData } = useZonasMapa();

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
            placeholder="Buscar zona..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>
        <Select
          value={activo === undefined ? "all" : String(activo)}
          onValueChange={(value) => {
            setActivo(value === "all" ? undefined : value === "true");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
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
        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Crear zona
        </Button>
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
          <ZonasMapView zonas={zonasMapaData ?? []} />
        </TabsContent>
      </Tabs>

      <ZonaFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
