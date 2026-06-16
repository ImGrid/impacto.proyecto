"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, SlidersHorizontal, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useZonas } from "@/hooks/use-zonas";
import { useAsociaciones } from "@/hooks/use-asociaciones";
import { useMateriales } from "@/hooks/use-materiales";
import { useDepartamentoActivo } from "@/components/departamento-context";
import type { ReporteRecolectorasFiltros } from "@/types/reportes";

function parse(s?: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function fmtD(d?: Date): string | undefined {
  return d ? format(d, "yyyy-MM-dd") : undefined;
}

type Props = {
  value: ReporteRecolectorasFiltros;
  onChange: (next: ReporteRecolectorasFiltros) => void;
};

export function RecolectorasFiltros({ value, onChange }: Props) {
  const depto = useDepartamentoActivo();
  const { data: zonas } = useZonas({
    limit: 100,
    activo: true,
    departamentoId: depto ?? undefined,
  });
  const { data: asociaciones } = useAsociaciones({ limit: 100, activo: true });
  const { data: materiales } = useMateriales({ limit: 100, activo: true });

  const patch = (p: Partial<ReporteRecolectorasFiltros>) =>
    onChange({ ...value, ...p });

  const desde = parse(value.desde);
  const hasta = parse(value.hasta);

  const secundarios = [
    value.genero,
    value.edad_min,
    value.edad_max,
    value.trabaja_individual,
    value.material_recolectado,
    value.material_habitual,
    value.solo_activas ? true : undefined,
  ].filter((v) => v != null).length;

  const tieneFiltros = Object.values(value).some((v) => v != null && v !== "");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      {/* Buscar por nombre */}
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-xs font-medium">Nombre</label>
        <div className="relative">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={value.search ?? ""}
            onChange={(e) => patch({ search: e.target.value || undefined })}
            placeholder="Buscar recolectora…"
            className="h-8 w-[180px] pl-8"
          />
        </div>
      </div>

      {/* Desde / Hasta */}
      <DatePick label="Desde" date={desde} onSelect={(d) => patch({ desde: fmtD(d) })} max={hasta ?? new Date()} />
      <DatePick label="Hasta" date={hasta} onSelect={(d) => patch({ hasta: fmtD(d) })} min={desde} max={new Date()} />

      {/* Zona */}
      <SelectFiltro
        label="Zona"
        value={value.zona_id}
        placeholderAll="Todas las zonas"
        options={(zonas?.data ?? []).map((z) => ({ value: z.id, label: z.nombre }))}
        onChange={(v) => patch({ zona_id: v })}
      />

      {/* Asociación */}
      <SelectFiltro
        label="Asociación"
        value={value.asociacion_id}
        placeholderAll="Todas las asociaciones"
        options={(asociaciones?.data ?? []).map((a) => ({ value: a.id, label: a.nombre }))}
        onChange={(v) => patch({ asociacion_id: v })}
      />

      {/* Más filtros */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
            Más filtros
            {secundarios > 0 && (
              <Badge variant="secondary" className="ml-1.5">
                {secundarios}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] space-y-3" align="start">
          {/* Género */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">Género</label>
            <Select
              value={value.genero ?? "all"}
              onValueChange={(v) =>
                patch({ genero: v === "all" ? undefined : (v as "HOMBRE" | "MUJER") })
              }
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="MUJER">Mujer</SelectItem>
                <SelectItem value="HOMBRE">Hombre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Edad */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">Edad (años)</label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={0}
                max={120}
                value={value.edad_min ?? ""}
                onChange={(e) =>
                  patch({ edad_min: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Mín"
                className="h-8"
              />
              <span className="text-muted-foreground text-xs">a</span>
              <Input
                type="number"
                min={0}
                max={120}
                value={value.edad_max ?? ""}
                onChange={(e) =>
                  patch({ edad_max: e.target.value ? Number(e.target.value) : undefined })
                }
                placeholder="Máx"
                className="h-8"
              />
            </div>
          </div>

          {/* Individual / grupo */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">Modalidad</label>
            <Select
              value={
                value.trabaja_individual === undefined
                  ? "all"
                  : value.trabaja_individual
                    ? "ind"
                    : "grupo"
              }
              onValueChange={(v) =>
                patch({
                  trabaja_individual: v === "all" ? undefined : v === "ind",
                })
              }
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="ind">Individual</SelectItem>
                <SelectItem value="grupo">En grupo/asociación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Material recolectado (real) */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">
              Recolectó (real, en el período)
            </label>
            <Select
              value={value.material_recolectado != null ? String(value.material_recolectado) : "all"}
              onValueChange={(v) =>
                patch({ material_recolectado: v === "all" ? undefined : Number(v) })
              }
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier material</SelectItem>
                {(materiales?.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Material habitual (declarado) */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">
              Recoge normalmente (declarado)
            </label>
            <Select
              value={value.material_habitual != null ? String(value.material_habitual) : "all"}
              onValueChange={(v) =>
                patch({ material_habitual: v === "all" ? undefined : Number(v) })
              }
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Cualquier material</SelectItem>
                {(materiales?.data ?? []).map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Solo activas */}
          <div className="flex flex-col gap-1">
            <label className="text-muted-foreground text-xs font-medium">Actividad</label>
            <Select
              value={value.solo_activas ? "activas" : "all"}
              onValueChange={(v) =>
                patch({ solo_activas: v === "activas" ? true : undefined })
              }
            >
              <SelectTrigger size="sm" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="activas">Solo con entregas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </PopoverContent>
      </Popover>

      {tieneFiltros && (
        <Button variant="ghost" size="sm" onClick={() => onChange({})}>
          <X className="mr-1 h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}

function DatePick({
  label,
  date,
  onSelect,
  min,
  max,
}: {
  label: string;
  date?: Date;
  onSelect: (d?: Date) => void;
  min?: Date;
  max?: Date;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-muted-foreground text-xs font-medium">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-[140px] justify-start text-left font-normal",
              !date && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5" />
            {date ? format(date, "dd MMM yyyy", { locale: es }) : "Elegir"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={onSelect}
            locale={es}
            disabled={(d) => (max ? d > max : false) || (min ? d < min : false)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function SelectFiltro({
  label,
  value,
  placeholderAll,
  options,
  onChange,
}: {
  label: string;
  value?: number;
  placeholderAll: string;
  options: { value: number; label: string }[];
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-muted-foreground text-xs font-medium">{label}</label>
      <Select
        value={value != null ? String(value) : "all"}
        onValueChange={(v) => onChange(v === "all" ? undefined : Number(v))}
      >
        <SelectTrigger size="sm" className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{placeholderAll}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={String(o.value)}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
