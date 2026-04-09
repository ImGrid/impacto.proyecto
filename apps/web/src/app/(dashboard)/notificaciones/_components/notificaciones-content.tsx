"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { useNotificaciones } from "@/hooks/use-notificaciones";
import { useZonas } from "@/hooks/use-zonas";
import { notificacionesColumns } from "./notificaciones-columns";
import { DataTable } from "@/components/shared/data-table";
import { NotificacionFormDialog } from "./notificacion-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TIPO_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "SISTEMA", label: "Individual" },
];

export function NotificacionesContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [zonaId, setZonaId] = useState<number | undefined>(undefined);
  const [tipo, setTipo] = useState<string | undefined>(undefined);

  const { data, isLoading } = useNotificaciones({
    page,
    limit: pageSize,
    search,
    zona_id: zonaId,
    tipo,
  });

  const { data: zonasOpts } = useZonas({ limit: 100, activo: true });

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
            placeholder="Buscar notificación..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        <Select
          value={zonaId === undefined ? "all" : String(zonaId)}
          onValueChange={(value) => {
            setZonaId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
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
          value={tipo ?? "all"}
          onValueChange={(value) => {
            setTipo(value === "all" ? undefined : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {TIPO_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Enviar notificación
        </Button>
      </div>

      <DataTable
        columns={notificacionesColumns}
        data={data?.data ?? []}
        pageCount={data?.meta.totalPages ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        isLoading={isLoading}
      />

      <NotificacionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
