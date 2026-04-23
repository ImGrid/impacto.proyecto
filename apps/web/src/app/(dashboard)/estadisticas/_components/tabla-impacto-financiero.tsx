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
 * Tabla "Impacto financiero por recolectora" — inspirada en la hoja
 * VENTA DE MATERIALES del Excel del cliente.
 *
 * Columnas: nombre, CI, kg recolectado, Bs total, CO₂ evitado (kg).
 * Orden por kg descendente (quien más recolectó arriba).
 */
interface Props {
  items: EstadisticasData["por_recolectora"];
}

function fmt2(n: number): string {
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function TablaImpactoFinanciero({ items }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Impacto financiero por recolectora</CardTitle>
        <CardDescription>
          Kilos entregados, ingresos y CO₂ evitado por cada recolectora
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
                  <TableHead>Recolectora</TableHead>
                  <TableHead>CI</TableHead>
                  <TableHead className="text-right">Kg</TableHead>
                  <TableHead className="text-right">Total (Bs)</TableHead>
                  <TableHead className="text-right">CO₂ evitado (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.nombre}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {r.ci}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt2(r.kg)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt2(r.bs)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt2(r.co2_kg)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
