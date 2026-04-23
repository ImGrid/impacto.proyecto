"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import type { EstadisticasFilters } from "@/types/api";
import { useZonas } from "@/hooks/use-zonas";
import { useMateriales } from "@/hooks/use-materiales";

interface FiltrosBarProps {
  value: EstadisticasFilters;
  onChange: (next: EstadisticasFilters) => void;
}

function parseDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function fmtDate(d?: Date): string | undefined {
  if (!d) return undefined;
  return format(d, "yyyy-MM-dd");
}

/**
 * Barra de filtros para la página de estadísticas: rango de fechas
 * (desde / hasta), zona y material. Los cambios propagan al padre para
 * que el hook `useEstadisticas` refresque.
 *
 * Patrón: Filtros en una fila horizontal arriba, con popover de fecha
 * y selects nativos de shadcn. "Limpiar" aparece solo si hay algo
 * aplicado, evita ruido visual.
 */
export function FiltrosBar({ value, onChange }: FiltrosBarProps) {
  const { data: zonasData } = useZonas({ limit: 100, activo: true });
  const { data: materialesData } = useMateriales({ limit: 100, activo: true });

  const desde = parseDate(value.desde);
  const hasta = parseDate(value.hasta);
  const tieneFiltros =
    value.desde != null ||
    value.hasta != null ||
    value.zona_id != null ||
    value.material_id != null;

  function setDesde(d?: Date) {
    onChange({ ...value, desde: fmtDate(d) });
  }
  function setHasta(d?: Date) {
    onChange({ ...value, hasta: fmtDate(d) });
  }
  function setZona(v: string) {
    onChange({ ...value, zona_id: v === "all" ? undefined : Number(v) });
  }
  function setMaterial(v: string) {
    onChange({ ...value, material_id: v === "all" ? undefined : Number(v) });
  }
  function limpiar() {
    onChange({});
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-xs font-medium">Desde</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !desde && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {desde ? format(desde, "dd MMM yyyy", { locale: es }) : "Elegir"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={desde}
              onSelect={setDesde}
              locale={es}
              disabled={(d) => (hasta ? d > hasta : d > new Date())}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-xs font-medium">Hasta</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-[140px] justify-start text-left font-normal",
                !hasta && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
              {hasta ? format(hasta, "dd MMM yyyy", { locale: es }) : "Elegir"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={hasta}
              onSelect={setHasta}
              locale={es}
              disabled={(d) => d > new Date() || (desde ? d < desde : false)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-xs font-medium">Zona</label>
        <Select
          value={value.zona_id != null ? String(value.zona_id) : "all"}
          onValueChange={setZona}
        >
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las zonas</SelectItem>
            {zonasData?.data.map((z) => (
              <SelectItem key={z.id} value={String(z.id)}>
                {z.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-muted-foreground text-xs font-medium">Material</label>
        <Select
          value={value.material_id != null ? String(value.material_id) : "all"}
          onValueChange={setMaterial}
        >
          <SelectTrigger size="sm" className="w-[180px]">
            <SelectValue />
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
      </div>

      {tieneFiltros && (
        <Button variant="ghost" size="sm" onClick={limpiar}>
          <X className="mr-1 h-3.5 w-3.5" />
          Limpiar
        </Button>
      )}
    </div>
  );
}
