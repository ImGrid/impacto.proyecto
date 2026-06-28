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
import { useRangoFechas } from "@/hooks/use-reportes";

/**
 * Selector de UNA fecha para los filtros de reportes. Compartido por el filtro
 * de período y el de recolectoras (antes había dos copias casi idénticas).
 *
 * - Conserva la selección de día específico.
 * - Añade desplegables de mes/año (cabecera del calendario) para saltar rápido,
 *   en español.
 * - El límite inferior del año se basa en el dato MÁS ANTIGUO de la BD
 *   (`useRangoFechas`), no en un año fijo: así el calendario siempre llega hasta
 *   donde realmente hay datos (si mañana cargan datos de 2021, aparece 2021).
 *   Si aún no hay datos, cae al año anterior.
 */
export function DatePick({
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
  const { data: rango } = useRangoFechas();
  const hoy = new Date();
  const minYear = rango?.min
    ? Number(rango.min.slice(0, 4))
    : hoy.getFullYear() - 1;
  const startMonth = new Date(minYear, 0, 1);

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
            captionLayout="dropdown"
            startMonth={startMonth}
            endMonth={max ?? hoy}
            defaultMonth={date ?? max ?? hoy}
            selected={date}
            onSelect={onSelect}
            locale={es}
            formatters={{
              formatMonthDropdown: (d) =>
                d.toLocaleString("es", { month: "short" }),
            }}
            disabled={(d) => (max ? d > max : false) || (min ? d < min : false)}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
