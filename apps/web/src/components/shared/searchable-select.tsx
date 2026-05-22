"use client";

import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type SearchableOption = { value: string; label: string };

interface SearchableSelectProps {
  options: SearchableOption[];
  /** Valor seleccionado, o `undefined` si no hay selección. */
  value?: string;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Si se define, agrega una opción inicial que limpia la selección. */
  allLabel?: string;
  /** Clases para el botón disparador (p. ej. ancho). */
  className?: string;
  disabled?: boolean;
}

/**
 * Select con búsqueda: Popover + Input + lista filtrada en cliente. Liviano,
 * sin dependencias extra (cmdk). Pensado para listas de ~decenas/cientos de
 * items (recolectoras, etc.).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Seleccionar",
  searchPlaceholder = "Buscar...",
  emptyText = "Sin resultados",
  allLabel,
  className,
  disabled,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function handleSelect(next: string | undefined) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between font-normal", className)}
        >
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
          >
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0" align="start">
        <div className="flex items-center border-b px-2">
          <Search className="h-4 w-4 shrink-0 opacity-50" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          {allLabel && (
            <button
              type="button"
              onClick={() => handleSelect(undefined)}
              className="hover:bg-accent flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm"
            >
              <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  value === undefined ? "opacity-100" : "opacity-0",
                )}
              />
              {allLabel}
            </button>
          )}
          {filtered.length === 0 ? (
            <p className="text-muted-foreground px-2 py-4 text-center text-sm">
              {emptyText}
            </p>
          ) : (
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => handleSelect(o.value)}
                className="hover:bg-accent flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    value === o.value ? "opacity-100" : "opacity-0",
                  )}
                />
                <span className="truncate">{o.label}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
