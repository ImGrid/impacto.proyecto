"use client";

import { MultiSelect, type MultiOption } from "@/components/shared/multi-select";

/**
 * Filtro extra (multi-select de una dimensión) para la barra de período de los
 * reportes agregados. Convierte entre `number[]` (el filtro) y `string[]` (el
 * MultiSelect). Aplica al cerrar el dropdown.
 */
export function ReporteFiltroExtra({
  label,
  options,
  value,
  onChange,
  noun,
  placeholder = "Todos",
  width = "w-[190px]",
}: {
  label: string;
  options: MultiOption[];
  value: number[] | undefined;
  onChange: (v: number[] | undefined) => void;
  noun?: { one: string; many: string };
  placeholder?: string;
  width?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <MultiSelect
        options={options}
        value={(value ?? []).map(String)}
        onChange={(v) => onChange(v.length ? v.map(Number) : undefined)}
        placeholder={placeholder}
        noun={noun}
        className={`h-8 ${width}`}
      />
    </div>
  );
}
