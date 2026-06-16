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
import { MultiSelect, type MultiOption } from "@/components/shared/multi-select";
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
const toStr = (a?: number[]) => (a ?? []).map(String);
const toNum = (a: string[]): number[] | undefined =>
  a.length ? a.map(Number) : undefined;

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

  const zonaOpts: MultiOption[] = (zonas?.data ?? []).map((z) => ({
    value: String(z.id),
    label: z.nombre,
  }));
  const asocOpts: MultiOption[] = (asociaciones?.data ?? []).map((a) => ({
    value: String(a.id),
    label: a.nombre,
  }));
  const matOpts: MultiOption[] = (materiales?.data ?? []).map((m) => ({
    value: String(m.id),
    label: m.nombre,
  }));

  // Cuántos filtros secundarios (los de "Más filtros") están activos.
  const secundarios = [
    value.genero,
    value.edad_min,
    value.edad_max,
    value.trabaja_individual,
    value.solo_activas ? true : undefined,
  ].filter((v) => v != null).length;

  const tieneFiltros = Object.values(value).some(
    (v) => v != null && v !== "" && !(Array.isArray(v) && v.length === 0),
  );

  // Chips de "filtros aplicados" para los multi-selects (reconocer, no recordar).
  const chips: { key: string; label: string; remove: () => void }[] = [];
  const pushChips = (
    ids: number[] | undefined,
    opts: MultiOption[],
    field: "zona_id" | "asociacion_id" | "material_habitual" | "material_recolectado",
    prefijo: string,
  ) => {
    for (const id of ids ?? []) {
      const lbl = opts.find((o) => o.value === String(id))?.label ?? `#${id}`;
      chips.push({
        key: `${field}-${id}`,
        label: `${prefijo}: ${lbl}`,
        remove: () =>
          patch({ [field]: (ids ?? []).filter((x) => x !== id) } as Partial<ReporteRecolectorasFiltros>),
      });
    }
  };
  pushChips(value.zona_id, zonaOpts, "zona_id", "Zona");
  pushChips(value.asociacion_id, asocOpts, "asociacion_id", "Asoc.");
  pushChips(value.material_habitual, matOpts, "material_habitual", "Recoge");
  pushChips(value.material_recolectado, matOpts, "material_recolectado", "Recolectó");

  return (
    <div className="space-y-2">
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

        <DatePick label="Desde" date={desde} onSelect={(d) => patch({ desde: fmtD(d) })} max={hasta ?? new Date()} />
        <DatePick label="Hasta" date={hasta} onSelect={(d) => patch({ hasta: fmtD(d) })} min={desde} max={new Date()} />

        <Campo label="Zona">
          <MultiSelect
            options={zonaOpts}
            value={toStr(value.zona_id)}
            onChange={(v) => patch({ zona_id: toNum(v) })}
            placeholder="Todas"
            noun={{ one: "zona", many: "zonas" }}
            className="h-8 w-[170px]"
          />
        </Campo>

        <Campo label="Asociación">
          <MultiSelect
            options={asocOpts}
            value={toStr(value.asociacion_id)}
            onChange={(v) => patch({ asociacion_id: toNum(v) })}
            placeholder="Todas"
            noun={{ one: "asociación", many: "asociaciones" }}
            className="h-8 w-[180px]"
          />
        </Campo>

        <Campo label="Recoge normalmente">
          <MultiSelect
            options={matOpts}
            value={toStr(value.material_habitual)}
            onChange={(v) => patch({ material_habitual: toNum(v) })}
            placeholder="Cualquiera"
            noun={{ one: "material", many: "materiales" }}
            className="h-8 w-[180px]"
          />
        </Campo>

        <Campo label="Recolectó (real)">
          <MultiSelect
            options={matOpts}
            value={toStr(value.material_recolectado)}
            onChange={(v) => patch({ material_recolectado: toNum(v) })}
            placeholder="Cualquiera"
            noun={{ one: "material", many: "materiales" }}
            className="h-8 w-[180px]"
          />
        </Campo>

        {/* Más filtros: SOLO controles simples (sin dropdowns anidados). */}
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
            <Segmented
              label="Género"
              value={value.genero ?? "all"}
              options={[
                { v: "all", l: "Todos" },
                { v: "MUJER", l: "Mujer" },
                { v: "HOMBRE", l: "Hombre" },
              ]}
              onChange={(v) =>
                patch({ genero: v === "all" ? undefined : (v as "HOMBRE" | "MUJER") })
              }
            />

            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground text-xs font-medium">Edad (años)</span>
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

            <Segmented
              label="Modalidad"
              value={
                value.trabaja_individual === undefined
                  ? "all"
                  : value.trabaja_individual
                    ? "ind"
                    : "grupo"
              }
              options={[
                { v: "all", l: "Todas" },
                { v: "ind", l: "Individual" },
                { v: "grupo", l: "En grupo" },
              ]}
              onChange={(v) =>
                patch({ trabaja_individual: v === "all" ? undefined : v === "ind" })
              }
            />

            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!value.solo_activas}
                onChange={(e) => patch({ solo_activas: e.target.checked ? true : undefined })}
              />
              Solo con entregas en el período
            </label>
          </PopoverContent>
        </Popover>

        {tieneFiltros && (
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>
            <X className="mr-1 h-3.5 w-3.5" />
            Limpiar
          </Button>
        )}
      </div>

      {/* Resumen de filtros aplicados (chips removibles). */}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          <span className="text-muted-foreground text-xs">Aplicados:</span>
          {chips.map((c) => (
            <Badge key={c.key} variant="secondary" className="gap-1 pr-1 font-normal">
              {c.label}
              <button
                type="button"
                onClick={c.remove}
                className="hover:bg-background/60 ml-0.5 rounded-full p-0.5"
                aria-label={`Quitar ${c.label}`}
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-muted-foreground text-xs font-medium">{label}</label>
      {children}
    </div>
  );
}

function Segmented({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { v: string; l: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div className="bg-muted inline-flex rounded-md p-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(o.v)}
            className={cn(
              "flex-1 rounded-sm px-2 py-1 text-xs font-medium transition-colors",
              value === o.v
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {o.l}
          </button>
        ))}
      </div>
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
