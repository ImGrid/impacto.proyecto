"use client";

import { useMemo } from "react";
import { Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

/**
 * Pie de distribución por material del mes actual.
 *
 * Solo mostramos pie cuando hay 2-6 categorías (pauta de data viz).
 * Si el cliente tiene más de 6 materiales activos, los menores se
 * agregan en "Otros" para no saturar el pie — mismo patrón que el
 * Excel original.
 */

// Paleta de 6 variables CSS ya expuestas por el componente chart de shadcn.
const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-1)",
];

interface MaterialPieChartProps {
  data: { id: number; nombre: string; kg: number; porcentaje: number }[];
}

export function MaterialPieChart({ data }: MaterialPieChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    // Agregar "Otros" si hay más de 6 materiales
    const primeros = data.slice(0, 5);
    const resto = data.slice(5);
    const otros =
      resto.length > 0
        ? {
            id: -1,
            nombre: "Otros",
            kg: resto.reduce((s, r) => s + r.kg, 0),
            porcentaje: resto.reduce((s, r) => s + r.porcentaje, 0),
          }
        : null;
    const finalData = otros ? [...primeros, otros] : primeros;

    // El ChartLegendContent busca en chartConfig usando el valor del
    // `nameKey` del Pie (en nuestro caso, el nombre del material). Si
    // la key del config no coincide con ese valor, solo se ve un círculo
    // de color. Por eso indexamos por nombre.
    const config: ChartConfig = {};
    finalData.forEach((m, i) => {
      config[m.nombre] = {
        label: m.nombre,
        color: CHART_COLORS[i % CHART_COLORS.length],
      };
    });

    return {
      chartData: finalData.map((m, i) => ({
        ...m,
        fill: CHART_COLORS[i % CHART_COLORS.length],
      })),
      chartConfig: config,
    };
  }, [data]);

  const total = data.reduce((s, d) => s + d.kg, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribución por material</CardTitle>
        <CardDescription>Kg recolectados este mes por tipo</CardDescription>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <div className="text-muted-foreground flex h-[240px] items-center justify-center text-sm">
            Aún no hay recolecciones este mes
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="mx-auto h-[240px]">
            <PieChart>
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    nameKey="nombre"
                    formatter={(value, name) =>
                      `${name}: ${Number(value).toFixed(1)} kg`
                    }
                    hideIndicator={false}
                  />
                }
              />
              <Pie
                data={chartData}
                dataKey="kg"
                nameKey="nombre"
                innerRadius={55}
                outerRadius={85}
                strokeWidth={2}
              />
              <ChartLegend
                content={<ChartLegendContent nameKey="nombre" />}
                wrapperStyle={{ paddingTop: 8 }}
              />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
