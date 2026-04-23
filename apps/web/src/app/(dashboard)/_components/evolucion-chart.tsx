"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/**
 * Línea de evolución de los últimos 6 meses.
 *
 * Se grafica kg recolectado (eje izquierdo). La decisión de mostrar solo
 * kg y no también Bs sigue el principio "máximo 2 series por gráfico" de
 * las guías de dashboard — más saturarían visualmente. Los Bs aparecen
 * en su propio KPI card arriba.
 */

const chartConfig = {
  kg: {
    label: "Recolectado",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const MESES_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];

function formatMes(mes: string): string {
  // "2026-04" → "abr 26"
  const [y, m] = mes.split("-");
  const idx = Number(m) - 1;
  return `${MESES_ES[idx] ?? m} ${y.slice(2)}`;
}

interface EvolucionChartProps {
  data: { mes: string; kg: number; bs: number }[];
}

export function EvolucionChart({ data }: EvolucionChartProps) {
  const chartData = data.map((d) => ({
    mes: formatMes(d.mes),
    kg: d.kg,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolución mensual</CardTitle>
        <CardDescription>Kg recolectados en los últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[240px] w-full">
          <LineChart data={chartData} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={40}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Line
              dataKey="kg"
              type="monotone"
              stroke="var(--color-kg)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
