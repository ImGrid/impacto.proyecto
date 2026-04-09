"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { usePreciosMaterial } from "@/hooks/use-precios-material";
import { useMateriales } from "@/hooks/use-materiales";
import { columns } from "./columns";
import { DataTable } from "@/components/shared/data-table";
import { PrecioMaterialFormDialog } from "./precio-material-form-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VIGENCIA_OPTIONS = [
  { value: "vigentes", label: "Vigentes" },
  { value: "vencidos", label: "Vencidos" },
  { value: "todos", label: "Todos" },
];

export function PreciosMaterialContent() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [materialId, setMaterialId] = useState<number | undefined>(undefined);
  const [vigencia, setVigencia] = useState<
    "vigentes" | "vencidos" | "todos"
  >("vigentes");

  const { data, isLoading } = usePreciosMaterial({
    page,
    limit: pageSize,
    search,
    material_id: materialId,
    vigencia,
  });

  const { data: materialesData } = useMateriales({
    limit: 100,
    activo: true,
  });

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
            placeholder="Buscar por material..."
            value={search}
            onChange={handleSearchChange}
            className="pl-9"
          />
        </div>

        <Select
          value={materialId === undefined ? "all" : String(materialId)}
          onValueChange={(value) => {
            setMaterialId(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Material" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los materiales</SelectItem>
            {materialesData?.data.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={vigencia}
          onValueChange={(value) => {
            setVigencia(value as typeof vigencia);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Vigencia" />
          </SelectTrigger>
          <SelectContent>
            {VIGENCIA_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button onClick={() => setCreateOpen(true)}>
          <Plus />
          Nuevo precio
        </Button>
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

      <PrecioMaterialFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </div>
  );
}
