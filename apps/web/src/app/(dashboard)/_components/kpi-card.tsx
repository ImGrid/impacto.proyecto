"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * KPI Card con delta contra el período anterior.
 *
 * Patrones aplicados de la investigación:
 * - Valor grande tipográficamente dominante (jerarquía visual).
 * - Delta pill con color como "señal": verde = mejoró, rojo = empeoró,
 *   gris = sin dato. Coincide con "color como signal, no decoración".
 * - Skeleton que coincide con el layout final para no reflowar.
 */
interface KpiCardProps {
  label: string;
  value: number;
  previous: number;
  unit?: string;
  // Sugerencia para el formato del valor principal. Bs usa 2 decimales
  // con separador boliviano; kg usa 2 decimales; enteros sin decimales.
  format?: "kg" | "bs" | "int";
  icon?: React.ReactNode;
  loading?: boolean;
}

function formatNumber(value: number, format: "kg" | "bs" | "int") {
  if (format === "int") {
    return new Intl.NumberFormat("es-BO", { maximumFractionDigits: 0 }).format(
      value,
    );
  }
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function computeDelta(current: number, previous: number) {
  // Sin comparación si el período anterior no tiene datos.
  if (previous === 0) return { pct: null, direction: "flat" as const };
  const diff = current - previous;
  const pct = (diff / previous) * 100;
  const direction: "up" | "down" | "flat" =
    Math.abs(pct) < 0.1 ? "flat" : pct > 0 ? "up" : "down";
  return { pct, direction };
}

export function KpiCard({
  label,
  value,
  previous,
  unit,
  format = "int",
  icon,
  loading,
}: KpiCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="mb-3 h-4 w-24" />
          <Skeleton className="mb-2 h-8 w-32" />
          <Skeleton className="h-4 w-20" />
        </CardContent>
      </Card>
    );
  }

  const delta = computeDelta(value, previous);
  const deltaColor =
    delta.direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : delta.direction === "down"
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";
  const DeltaIcon =
    delta.direction === "up"
      ? ArrowUp
      : delta.direction === "down"
        ? ArrowDown
        : Minus;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          {icon && (
            <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">
              {icon}
            </span>
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-bold tracking-tight">
            {formatNumber(value, format)}
          </span>
          {unit && (
            <span className="text-muted-foreground text-sm">{unit}</span>
          )}
        </div>
        <div className={cn("mt-1 flex items-center gap-1 text-xs", deltaColor)}>
          <DeltaIcon className="h-3 w-3" />
          {delta.pct === null ? (
            <span>Sin datos del mes anterior</span>
          ) : (
            <>
              <span className="font-medium">
                {delta.pct > 0 ? "+" : ""}
                {delta.pct.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">vs mes anterior</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
