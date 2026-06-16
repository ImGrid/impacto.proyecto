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
export function ReporteResumen({
  items,
  loading,
}: {
  items: ResumenItem[];
  loading?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
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
