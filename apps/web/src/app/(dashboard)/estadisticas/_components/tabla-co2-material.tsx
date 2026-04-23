"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EstadisticasData } from "@/types/api";

/**
 * Tabla "CO₂ evitado por material" — réplica de la hoja POR MATERIAL
 * del Excel del cliente, con factor de conversión explícito.
 */
interface Props {
  items: EstadisticasData["por_material"];
}

function fmt2(n: number): string {
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function TablaCo2Material({ items }: Props) {
  const totalKg = items.reduce((s, m) => s + m.kg, 0);
  const totalCo2 = items.reduce((s, m) => s + m.co2_evitado_kg, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>CO₂ evitado por material</CardTitle>
        <CardDescription>
          Factor de conversión (tCO₂e/t) × kilos recolectados
        </CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-muted-foreground flex h-[100px] items-center justify-center text-sm">
            Sin datos en el rango seleccionado
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Kg</TableHead>
                  <TableHead className="text-right">Factor</TableHead>
                  <TableHead className="text-right">CO₂ evitado (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nombre}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt2(m.kg)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.factor_co2 != null ? fmt2(m.factor_co2) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt2(m.co2_evitado_kg)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt2(totalKg)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="text-right tabular-nums">
                    {fmt2(totalCo2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
