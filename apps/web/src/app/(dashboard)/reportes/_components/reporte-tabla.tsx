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
  /**
   * Contenido personalizado de la celda (p. ej. el nombre como botón para
   * abrir la ficha). Si se define, reemplaza al formateo por `format`.
   */
  render?: (row: T) => React.ReactNode;
};

/**
 * Tabla de detalle de un reporte. Números a la derecha (tabular-nums),
 * formateados es-BO, y fila de TOTAL destacada — patrón docs/27-28. Para los
 * reportes (pocas filas) no se pagina.
 *
 * `nota`: aclaración al pie (sobre qué se calculan los porcentajes, qué columna
 * no es sumable). Va aquí y no en cada página para que el texto sea el mismo en
 * pantalla y en los archivos exportados.
 */
export function ReporteTabla<T extends Record<string, unknown>>({
  columns,
  rows,
  total,
  totalLabel = "TOTAL",
  emptyLabel = "Sin datos en el período seleccionado.",
  nota,
}: {
  columns: ReporteColumna<T>[];
  rows: T[];
  total?: Partial<Record<keyof T & string, number>>;
  totalLabel?: string;
  emptyLabel?: string;
  nota?: string;
}) {
  const esNumerica = (c: ReporteColumna<T>) =>
    c.align === "right" || (c.format != null && c.format !== "text");

  return (
    <div className="space-y-1.5">
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
                      {c.render
                        ? c.render(row)
                        : c.format && c.format !== "text"
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
      {nota && rows.length > 0 && (
        <p className="text-muted-foreground text-xs">{nota}</p>
      )}
    </div>
  );
}
