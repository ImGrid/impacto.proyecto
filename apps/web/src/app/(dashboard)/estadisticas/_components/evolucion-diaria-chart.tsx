"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/**
 * Gráfico de área para evolución diaria (o semanal si el rango es muy
 * grande — el backend decide). El área visualiza mejor la "cantidad
 * acumulada a lo largo del tiempo" que una línea pura.
 */

interface Props {
  items: { fecha: string; kg: number; bs: number }[];
}

const chartConfig = {
  kg: { label: "Recolectado (kg)", color: "var(--chart-1)" },
} satisfies ChartConfig;

function formatTick(s: string): string {
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return format(date, "d MMM", { locale: es });
}

export function EvolucionDiariaChart({ items }: Props) {
  // Reducir densidad de ticks cuando hay muchos puntos, para no saturar.
  const interval = items.length > 30 ? Math.floor(items.length / 10) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución en el tiempo</CardTitle>
        <CardDescription>
          Kilos recolectados por día en el rango seleccionado
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
            Sin datos en el rango seleccionado
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <AreaChart data={items} margin={{ left: 8, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="fecha"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={interval}
                tickFormatter={formatTick}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                width={40}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(label) => formatTick(label as string)}
                  />
                }
              />
              <defs>
                <linearGradient id="fillKg" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="var(--color-kg)"
                    stopOpacity={0.4}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--color-kg)"
                    stopOpacity={0.05}
                  />
                </linearGradient>
              </defs>
              <Area
                dataKey="kg"
                type="monotone"
                stroke="var(--color-kg)"
                fill="url(#fillKg)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
