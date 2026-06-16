"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmt, type ReporteFormato } from "./format";

export type ReporteColumna<T> = {
  key: keyof T & string;
  header: string;
  format?: ReporteFormato;
  align?: "left" | "right";
};

/**
 * Tabla de detalle de un reporte. Números a la derecha (tabular-nums),
 * formateados es-BO, y fila de TOTAL destacada — patrón docs/27-28. Para los
 * reportes (pocas filas) no se pagina.
 */
export function ReporteTabla<T extends Record<string, unknown>>({
  columns,
  rows,
  total,
  totalLabel = "TOTAL",
  emptyLabel = "Sin datos en el período seleccionado.",
}: {
  columns: ReporteColumna<T>[];
  rows: T[];
  total?: Partial<Record<keyof T & string, number>>;
  totalLabel?: string;
  emptyLabel?: string;
}) {
  const esNumerica = (c: ReporteColumna<T>) =>
    c.align === "right" || (c.format != null && c.format !== "text");

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead
                key={c.key}
                className={esNumerica(c) ? "text-right" : undefined}
              >
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-muted-foreground py-10 text-center text-sm"
              >
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell
                    key={c.key}
                    className={
                      esNumerica(c) ? "text-right tabular-nums" : undefined
                    }
                  >
                    {c.format && c.format !== "text"
                      ? fmt(Number(row[c.key]), c.format)
                      : String(row[c.key] ?? "")}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
          {total && rows.length > 0 && (
            <TableRow className="border-t-2 font-semibold">
              {columns.map((c, idx) => {
                if (idx === 0)
                  return <TableCell key={c.key}>{totalLabel}</TableCell>;
                const v = total[c.key];
                return (
                  <TableCell key={c.key} className="text-right tabular-nums">
                    {typeof v === "number" && c.format && c.format !== "text"
                      ? fmt(v, c.format)
                      : ""}
                  </TableCell>
                );
              })}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
