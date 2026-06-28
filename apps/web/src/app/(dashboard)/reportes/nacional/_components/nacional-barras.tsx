"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
 * Barras horizontales para comparar departamentos por una métrica configurable
 * (kg / Bs / CO₂). Está modelado igual que `RankingChart` (estadísticas) pero
 * parametrizando la etiqueta/unidad: `RankingChart` está fijo a "kg" y lo usan
 * 7 páginas, así que NO se modifica — este componente es propio del nacional.
 */
export function NacionalBarras({
  title,
  description,
  unidad,
  items,
  emptyLabel = "Sin datos en el período seleccionado",
}: {
  title: string;
  description?: string;
  /** Etiqueta de la métrica (p. ej. "kg", "Bs", "kg CO₂") — va en el tooltip. */
  unidad: string;
  items: { label: string; value: number }[];
  emptyLabel?: string;
}) {
  // Solo departamentos con valor > 0 (un gráfico de barras en cero no comunica),
  // ordenados desc; se invierte para que el mayor quede arriba (recharts plotea
  // de abajo hacia arriba), igual que RankingChart.
  const data = [...items]
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value)
    .reverse();

  const chartConfig = {
    value: { label: unidad, color: "var(--chart-1)" },
  } satisfies ChartConfig;

  const height = Math.max(180, data.length * 40);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="text-muted-foreground flex h-[180px] items-center justify-center text-sm">
            {emptyLabel}
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="w-full"
            style={{ height: `${height}px` }}
          >
            <BarChart
              data={data}
              layout="vertical"
              margin={{ left: 8, right: 16, top: 8, bottom: 8 }}
            >
              <CartesianGrid horizontal={false} strokeDasharray="3 3" />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                type="category"
                dataKey="label"
                tickLine={false}
                axisLine={false}
                width={110}
                tickMargin={8}
                style={{ fontSize: 12 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
