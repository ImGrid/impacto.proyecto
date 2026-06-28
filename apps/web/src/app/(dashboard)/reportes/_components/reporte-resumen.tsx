"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtNum } from "./format";

export type ResumenItem = {
  label: string;
  value: number;
  decimals?: number;
  unit?: string;
  icon?: React.ReactNode;
};

/**
 * Banda de KPIs/BAN del reporte: número grande (es-BO) + etiqueta + unidad.
 * Sin delta (un reporte no compara contra período previo) — docs/28.
 */
// Columnas en pantalla ancha según el nº de KPIs (clases literales para que
// Tailwind las incluya en el build). Así 4 KPIs llenan el ancho sin hueco.
const COLS_LG: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
};

export function ReporteResumen({
  items,
  loading,
}: {
  items: ResumenItem[];
  loading?: boolean;
}) {
  const lg = COLS_LG[items.length] ?? "lg:grid-cols-5";
  return (
    <div className={`grid grid-cols-2 gap-4 sm:grid-cols-3 ${lg}`}>
      {items.map((it, i) => (
        <Card key={i}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-sm font-medium">
                {it.label}
              </p>
              {it.icon && (
                <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
                  {it.icon}
                </span>
              )}
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <>
                  <span className="text-2xl font-bold tracking-tight">
                    {fmtNum(it.value, it.decimals ?? 0)}
                  </span>
                  {it.unit && (
                    <span className="text-muted-foreground text-sm">
                      {it.unit}
                    </span>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
