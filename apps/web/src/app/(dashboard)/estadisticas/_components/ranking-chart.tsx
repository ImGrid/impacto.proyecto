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
 * Bar chart horizontal para rankings. Se prefiere barras horizontales
 * cuando hay >5 categorías y nombres largos (nombres de personas,
 * sucursales) — siguen siendo legibles sin rotación.
 */
interface RankingChartProps {
  title: string;
  description?: string;
  items: { id: number; label: string; kg: number }[];
  emptyLabel?: string;
}

const chartConfig = {
  kg: { label: "kg", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function RankingChart({
  title,
  description,
  items,
  emptyLabel = "Sin datos en el rango seleccionado",
}: RankingChartProps) {
  // Ordenado descendente — que aparezca en la parte superior del eje Y
  // la barra más grande. Recharts plotea de abajo hacia arriba; al
  // invertir el array, la #1 queda arriba.
  const data = [...items]
    .sort((a, b) => b.kg - a.kg)
    .reverse()
    .map((i) => ({ label: i.label, kg: i.kg }));

  const height = Math.max(180, data.length * 36);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
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
                width={150}
                tickMargin={8}
                style={{ fontSize: 12 }}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent indicator="line" />}
              />
              <Bar dataKey="kg" fill="var(--color-kg)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
