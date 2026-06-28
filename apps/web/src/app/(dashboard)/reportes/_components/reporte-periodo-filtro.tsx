"use client";

import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DatePick } from "./date-pick";

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
  sinFechasLabel = "Si no eliges fechas, se muestran los últimos 30 días",
}: {
  value: Periodo;
  onChange: (p: Periodo) => void;
  /** Filtros extra (p. ej. un multi-select de material) en la misma barra. */
  children?: React.ReactNode;
  /** Texto del hint de "sin fechas" (cada reporte define su default real). */
  sinFechasLabel?: string;
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
            onClick={() => {
              const n = new Date();
              const ini = new Date(n.getFullYear(), n.getMonth() - 1, 1);
              const fin = new Date(n.getFullYear(), n.getMonth(), 0);
              onChange({ desde: fmtD(ini), hasta: fmtD(fin) });
            }}
          >
            Mes pasado
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const n = new Date();
              const ini = new Date(n.getFullYear(), n.getMonth() - 2, 1);
              onChange({ desde: fmtD(ini), hasta: hoyStr() });
            }}
          >
            Últimos 3 meses
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ desde: `${y}-01-01`, hasta: hoyStr() })}
          >
            Este año
          </Button>
          {(value.desde || value.hasta) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange({ desde: undefined, hasta: undefined })}
            >
              Limpiar
            </Button>
          )}
        </div>
      </div>
      <p className="text-muted-foreground ml-auto self-center text-xs">
        {sinFechasLabel}
      </p>
    </div>
  );
}

