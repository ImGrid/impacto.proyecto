"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type Periodo = { desde?: string; hasta?: string };

function parse(s?: string): Date | undefined {
  if (!s) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}
function fmtD(d?: Date): string | undefined {
  if (!d) return undefined;
  return format(d, "yyyy-MM-dd");
}
function hoyStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Filtro de período para los reportes (lenguaje simple, pocos controles —
 * docs/28). Sin fechas → el backend usa los últimos 30 días. Botones rápidos
 * para el usuario no técnico.
 */
export function ReportePeriodoFiltro({
  value,
  onChange,
  children,
}: {
  value: Periodo;
  onChange: (p: Periodo) => void;
  /** Filtros extra (p. ej. un multi-select de material) en la misma barra. */
  children?: React.ReactNode;
}) {
  const desde = parse(value.desde);
  const hasta = parse(value.hasta);
  const y = new Date().getFullYear();
  const mes = String(new Date().getMonth() + 1).padStart(2, "0");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border bg-card p-3">
      <DatePick
        label="Desde"
        date={desde}
        onSelect={(d) => onChange({ ...value, desde: fmtD(d) })}
        max={hasta ?? new Date()}
      />
      <DatePick
        label="Hasta"
        date={hasta}
        onSelect={(d) => onChange({ ...value, hasta: fmtD(d) })}
        min={desde}
        max={new Date()}
      />
      {children}
      <div className="flex flex-col gap-1">
        <span className="text-muted-foreground text-xs font-medium">Rápido</span>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ desde: `${y}-${mes}-01`, hasta: hoyStr() })}
          >
            Este mes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ desde: `${y}-01-01`, hasta: hoyStr() })}
          >
            Este año
          </Button>
          {(value.desde || value.hasta) && (
            <Button variant="ghost" size="sm" onClick={() => onChange({})}>
              Limpiar
            </Button>
          )}
        </div>
      </div>
      <p className="text-muted-foreground ml-auto self-center text-xs">
        Sin fechas: últimos 30 días
      </p>
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
              "w-[150px] justify-start text-left font-normal",
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
