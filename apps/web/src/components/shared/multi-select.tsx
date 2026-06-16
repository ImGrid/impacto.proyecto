"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type MultiOption = { value: string; label: string };

interface MultiSelectProps {
  options: MultiOption[];
  /** Valores seleccionados. */
  value: string[];
  /** Se llama AL CERRAR el dropdown (no en cada clic) para evitar refetch por toggle. */
  onChange: (next: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Texto singular/plural para el resumen ("material"/"materiales"). */
  noun?: { one: string; many: string };
  className?: string;
  disabled?: boolean;
}

/**
 * Multi-select con búsqueda, "Seleccionar todo" y checkboxes (docs/30). Mismo
 * estilo liviano que `SearchableSelect` (Popover + Input, sin cmdk). Decisiones
 * respaldadas por la investigación UX:
 * - Checkboxes = señal de multi-selección; opciones visibles con marca.
 * - Buscador con AUTOFOCUS al abrir para listas largas.
 * - Aplica la selección AL CERRAR (no refetch en cada clic).
 * - El disparador muestra un badge con el conteo (reconocer, no recordar).
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Todos",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados",
  noun,
  className,
  disabled,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Borrador interno mientras está abierto; se confirma con onChange al cerrar.
  const [draft, setDraft] = useState<string[]>(value);
  const searchRef = useRef<HTMLInputElement>(null);

  // Sincroniza el borrador si cambia el valor externo (p. ej. "Limpiar todo").
  useEffect(() => {
    if (!open) setDraft(value);
  }, [value, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const draftSet = useMemo(() => new Set(draft), [draft]);
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((o) => draftSet.has(o.value));

  function commit(next: string[]) {
    setDraft(next);
  }
  function toggle(v: string) {
    commit(draftSet.has(v) ? draft.filter((x) => x !== v) : [...draft, v]);
  }
  function toggleAllFiltered() {
    if (allFilteredSelected) {
      const remove = new Set(filtered.map((o) => o.value));
      commit(draft.filter((v) => !remove.has(v)));
    } else {
      const add = filtered.map((o) => o.value);
      commit([...new Set([...draft, ...add])]);
    }
  }

  function handleOpenChange(o: boolean) {
    setOpen(o);
    if (o) {
      setDraft(value);
      // autofocus al buscador
      setTimeout(() => searchRef.current?.focus(), 0);
    } else {
      setQuery("");
      // Confirma la selección sólo si cambió (evita refetch innecesario).
      if (draft.length !== value.length || draft.some((v) => !value.includes(v))) {
        onChange(draft);
      }
    }
  }

  const count = value.length;
  const resumen =
    count === 0
      ? placeholder
      : count === 1
        ? (options.find((o) => o.value === value[0])?.label ?? `1 ${noun?.one ?? ""}`.trim())
        : `${count} ${noun?.many ?? "seleccionados"}`;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", className)}
        >
          <span className={cn("truncate", count === 0 && "text-muted-foreground")}>
            {resumen}
          </span>
          {count > 1 ? (
            <Badge variant="secondary" className="ml-2 shrink-0">
              {count}
            </Badge>
          ) : (
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="flex items-center border-b px-2">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        {/* Acciones: seleccionar todo (filtrados) / limpiar */}
        <div className="flex items-center justify-between border-b px-2 py-1.5">
          <button
            type="button"
            onClick={toggleAllFiltered}
            className="text-primary text-xs font-medium hover:underline"
            disabled={filtered.length === 0}
          >
            {allFilteredSelected ? "Quitar todos" : "Seleccionar todo"}
          </button>
          {draft.length > 0 && (
            <button
              type="button"
              onClick={() => commit([])}
              className="text-muted-foreground hover:text-foreground inline-flex items-center text-xs"
            >
              <X className="mr-1 h-3 w-3" />
              Limpiar
            </button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-center text-sm">
              {emptyText}
            </p>
          ) : (
            filtered.map((o) => {
              const checked = draftSet.has(o.value);
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className="hover:bg-accent flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm"
                >
                  <span
                    className={cn(
                      "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      checked
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-input",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
