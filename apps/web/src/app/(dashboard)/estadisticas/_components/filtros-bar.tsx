"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
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
import { useCiudades } from "@/hooks/use-ciudades";
import { useMateriales } from "@/hooks/use-materiales";
import { useTiposGenerador } from "@/hooks/use-tipos-generador";
import { useDepartamentoActivo } from "@/components/departamento-context";

interface FiltrosBarProps {
  value: EstadisticasFilters;
  onChange: (next: EstadisticasFilters) => void;
}

// Opciones fijas del tipo de destino polimórfico de la transacción.
const TIPO_DESTINO_OPTIONS = [
  { value: "centro_op", label: "Centro operacional" },
  { value: "externo", label: "Externo" },
  { value: "desconocido", label: "Desconocido" },
  { value: "sin_asignar", label: "Sin asignar" },
] as const;

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
 * Barra de filtros de la página de Estadísticas.
 *
 * Patrón (basado en investigación UX de filtros en dashboards): los filtros
 * más usados quedan visibles en la fila principal; los secundarios se
 * agrupan tras un botón "Más filtros" con un contador. Debajo, una fila de
 * chips muestra los filtros activos y permite quitarlos uno a uno.
 *
 * Todos estos filtros son "de recorte": achican el conjunto de datos pero la
 * página mantiene su estructura. El enfoque en una recolectora concreta NO
 * es un filtro de esta barra — es un drill-through (ver page.tsx).
 */
export function FiltrosBar({ value, onChange }: FiltrosBarProps) {
  // Zona y Ciudad se acotan al departamento activo: la página de
  // estadísticas ya está scopeada a ese departamento.
  const departamentoActivo = useDepartamentoActivo();
  const { data: zonasData } = useZonas({
    limit: 100,
    activo: true,
    departamentoId: departamentoActivo ?? undefined,
  });
  const { data: ciudadesData } = useCiudades({
    limit: 100,
    activo: true,
    departamento_id: departamentoActivo ?? undefined,
  });
  const { data: materialesData } = useMateriales({ limit: 100, activo: true });
  const { data: tiposGenData } = useTiposGenerador({
    limit: 100,
    activo: true,
  });

  const desde = parseDate(value.desde);
  const hasta = parseDate(value.hasta);

  // Cuántos filtros secundarios (los de "Más filtros") están activos.
  const secundariosActivos = [value.tipo_generador_id, value.tipo_destino].filter(
    (v) => v != null,
  ).length;

  const tieneFiltros =
    value.desde != null ||
    value.hasta != null ||
    value.zona_id != null ||
    value.ciudad_id != null ||
    value.material_id != null ||
    value.tipo_generador_id != null ||
    value.tipo_destino != null;

  function patch(parcial: Partial<EstadisticasFilters>) {
    onChange({ ...value, ...parcial });
  }

  function limpiar() {
    onChange({});
  }

  // --- Chips de filtros activos ---
  const chips: { key: string; label: string; onRemove: () => void }[] = [];
  if (desde)
    chips.push({
      key: "desde",
      label: `Desde: ${format(desde, "dd MMM yyyy", { locale: es })}`,
      onRemove: () => patch({ desde: undefined }),
    });
  if (hasta)
    chips.push({
      key: "hasta",
      label: `Hasta: ${format(hasta, "dd MMM yyyy", { locale: es })}`,
      onRemove: () => patch({ hasta: undefined }),
    });
  if (value.zona_id != null) {
    const z = zonasData?.data.find((x) => x.id === value.zona_id);
    chips.push({
      key: "zona",
      label: `Zona: ${z?.nombre ?? value.zona_id}`,
      onRemove: () => patch({ zona_id: undefined }),
    });
  }
  if (value.ciudad_id != null) {
    const c = ciudadesData?.data.find((x) => x.id === value.ciudad_id);
    chips.push({
      key: "ciudad",
      label: `Ciudad: ${c?.nombre ?? value.ciudad_id}`,
      onRemove: () => patch({ ciudad_id: undefined }),
    });
  }
  if (value.material_id != null) {
    const m = materialesData?.data.find((x) => x.id === value.material_id);
    chips.push({
      key: "material",
      label: `Material: ${m?.nombre ?? value.material_id}`,
      onRemove: () => patch({ material_id: undefined }),
    });
  }
  if (value.tipo_generador_id != null) {
    const t = tiposGenData?.data.find((x) => x.id === value.tipo_generador_id);
    chips.push({
      key: "tipo_generador",
      label: `Tipo generador: ${t?.nombre ?? value.tipo_generador_id}`,
      onRemove: () => patch({ tipo_generador_id: undefined }),
    });
  }
  if (value.tipo_destino != null) {
    const o = TIPO_DESTINO_OPTIONS.find((x) => x.value === value.tipo_destino);
    chips.push({
      key: "tipo_destino",
      label: `Destino: ${o?.label ?? value.tipo_destino}`,
      onRemove: () => patch({ tipo_destino: undefined }),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
        {/* Desde */}
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs font-medium">
            Desde
          </label>
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
                {desde
                  ? format(desde, "dd MMM yyyy", { locale: es })
                  : "Elegir"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={desde}
                onSelect={(d) => patch({ desde: fmtDate(d) })}
                locale={es}
                disabled={(d) => (hasta ? d > hasta : d > new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Hasta */}
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs font-medium">
            Hasta
          </label>
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
                {hasta
                  ? format(hasta, "dd MMM yyyy", { locale: es })
                  : "Elegir"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={hasta}
                onSelect={(d) => patch({ hasta: fmtDate(d) })}
                locale={es}
                disabled={(d) => d > new Date() || (desde ? d < desde : false)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Zona */}
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs font-medium">
            Zona
          </label>
          <Select
            value={value.zona_id != null ? String(value.zona_id) : "all"}
            onValueChange={(v) =>
              patch({ zona_id: v === "all" ? undefined : Number(v) })
            }
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

        {/* Ciudad */}
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs font-medium">
            Ciudad
          </label>
          <Select
            value={value.ciudad_id != null ? String(value.ciudad_id) : "all"}
            onValueChange={(v) =>
              patch({ ciudad_id: v === "all" ? undefined : Number(v) })
            }
          >
            <SelectTrigger size="sm" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las ciudades</SelectItem>
              {ciudadesData?.data.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Material */}
        <div className="flex flex-col gap-1">
          <label className="text-muted-foreground text-xs font-medium">
            Material
          </label>
          <Select
            value={value.material_id != null ? String(value.material_id) : "all"}
            onValueChange={(v) =>
              patch({ material_id: v === "all" ? undefined : Number(v) })
            }
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

        {/* Más filtros (secundarios) */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
              Más filtros
              {secundariosActivos > 0 && (
                <Badge variant="secondary" className="ml-1.5">
                  {secundariosActivos}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[260px] space-y-3" align="start">
            {/* Tipo de generador */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                Tipo de generador
              </label>
              <Select
                value={
                  value.tipo_generador_id != null
                    ? String(value.tipo_generador_id)
                    : "all"
                }
                onValueChange={(v) =>
                  patch({
                    tipo_generador_id: v === "all" ? undefined : Number(v),
                  })
                }
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  {tiposGenData?.data.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de destino */}
            <div className="flex flex-col gap-1">
              <label className="text-muted-foreground text-xs font-medium">
                Tipo de destino
              </label>
              <Select
                value={value.tipo_destino ?? "all"}
                onValueChange={(v) =>
                  patch({
                    tipo_destino:
                      v === "all"
                        ? undefined
                        : (v as EstadisticasFilters["tipo_destino"]),
                  })
                }
              >
                <SelectTrigger size="sm" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los destinos</SelectItem>
                  {TIPO_DESTINO_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>

        {tieneFiltros && (
          <Button variant="ghost" size="sm" onClick={limpiar}>
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Chips de filtros activos */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {chips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1 pr-1">
              {c.label}
              <button
                type="button"
                onClick={c.onRemove}
                aria-label={`Quitar ${c.label}`}
                className="hover:bg-muted-foreground/20 ml-0.5 rounded-sm p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
