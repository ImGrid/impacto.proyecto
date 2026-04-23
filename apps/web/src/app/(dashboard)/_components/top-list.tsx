"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Lista compacta de "Top N" con nombre + valor + barra proporcional.
 * Sigue el patrón BarList común en dashboards (Tremor, Geist) —
 * más fácil de leer que una tabla con 3 filas.
 */
interface TopListProps {
  title: string;
  description?: string;
  items: { id: number; nombre: string; valor: number; subtitulo?: string }[];
  unit?: string;
  emptyLabel?: string;
}

export function TopList({
  title,
  description,
  items,
  unit = "kg",
  emptyLabel = "Sin datos este mes",
}: TopListProps) {
  const max = items.reduce((m, i) => (i.valor > m ? i.valor : m), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-muted-foreground flex h-[100px] items-center justify-center text-sm">
            {emptyLabel}
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item, idx) => {
              const pct = max > 0 ? (item.valor / max) * 100 : 0;
              return (
                <li key={item.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground text-xs font-mono w-4">
                        {idx + 1}
                      </span>
                      <span className="truncate font-medium">{item.nombre}</span>
                    </div>
                    <span className="text-sm tabular-nums">
                      {item.valor.toFixed(1)} {unit}
                    </span>
                  </div>
                  {item.subtitulo && (
                    <p className="text-muted-foreground ml-6 text-xs">
                      {item.subtitulo}
                    </p>
                  )}
                  <div className="bg-muted ml-6 h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
