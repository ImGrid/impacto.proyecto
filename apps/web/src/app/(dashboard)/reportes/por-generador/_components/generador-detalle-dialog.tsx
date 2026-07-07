"use client";

import {
  Recycle,
  Wallet,
  Leaf,
  Boxes,
  Store,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReporte } from "@/hooks/use-reportes";
import type { ReporteGeneradorDetalle } from "@/types/reportes";
import { fmt, fmtNum } from "../../_components/format";

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Ficha (drill-through) de un generador. Mismo patrón que la ficha de sucursal:
 * datos + actividad real con KPIs y tablas. En capas para no doble-contar: los
 * KPIs y la lista de "Entregas" son a nivel transacción (conteo exacto), y el
 * "Resumen por sucursal" agrega cuánto aportó cada sucursal (kg/Bs, que suman
 * limpio a los KPIs) — sin números que confundan al operador.
 */
export function GeneradorDetalleDialog({
  id,
  periodo,
  open,
  onOpenChange,
}: {
  id: number | null;
  periodo: { desde?: string; hasta?: string };
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data, isLoading } = useReporte<ReporteGeneradorDetalle>(
    `por-generador/${id ?? 0}`,
    periodo,
    { enabled: open && id != null },
  );

  function descargar(formato: "excel" | "pdf") {
    if (id == null) return;
    const params = new URLSearchParams();
    if (periodo.desde) params.set("desde", periodo.desde);
    if (periodo.hasta) params.set("hasta", periodo.hasta);
    params.set("formato", formato);
    const a = document.createElement("a");
    a.href = `/api/reportes/por-generador/${id}/export?${params.toString()}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data?.perfil.nombre ?? "Generador"}</DialogTitle>
          <DialogDescription>
            {data
              ? [
                  data.perfil.tipo_generador,
                  data.perfil.departamentos.length
                    ? data.perfil.departamentos.join(", ")
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Actividad del período"
              : "Cargando datos y actividad…"}
          </DialogDescription>
        </DialogHeader>
        {data && (
          <div className="-mt-2 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => descargar("excel")}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => descargar("pdf")}>
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        )}
        {isLoading || !data ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <section className="space-y-3">
            <h3 className="text-sm font-semibold">
              Actividad real{" "}
              <span className="text-muted-foreground font-normal">
                (lo que aportaron sus sucursales en el período)
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <Mini icon={<Store />} label="Sucursales" value={fmtNum(data.actividad.total.sucursales, 0)} />
              <Mini icon={<Boxes />} label="Entregas" value={fmtNum(data.actividad.total.transacciones, 0)} />
              <Mini icon={<Recycle />} label="Recolectado" value={`${fmtNum(data.actividad.total.kg, 2)} kg`} />
              <Mini icon={<Leaf />} label="CO₂ evitado" value={`${fmtNum(data.actividad.total.co2_kg, 2)} kg`} />
              <Mini icon={<Wallet />} label="Generado" value={`Bs ${fmtNum(data.actividad.total.bs, 2)}`} />
            </div>

            {/* Resumen por sucursal: cuánto aportó cada una (kg/Bs). */}
            {data.actividad.por_sucursal.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  Cuánto aportó cada sucursal
                </p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>Ciudad</TableHead>
                        <TableHead className="text-right">Recolectado</TableHead>
                        <TableHead className="text-right">Generado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.actividad.por_sucursal.map((s) => (
                        <TableRow key={s.sucursal_id}>
                          <TableCell className="font-medium">{s.sucursal}</TableCell>
                          <TableCell>{s.ciudad}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(s.kg, "kg")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(s.bs, "bs")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Desglose por material. */}
            {data.actividad.por_material.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  Qué materiales se recolectaron
                </p>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Material</TableHead>
                        <TableHead className="text-right">Recolectado</TableHead>
                        <TableHead className="text-right">Generado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.actividad.por_material.map((m) => (
                        <TableRow key={m.material_id}>
                          <TableCell>{m.material}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(m.kg, "kg")}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {fmt(m.bs, "bs")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Entregas: una por transacción (con el origen de cada una). */}
            {data.actividad.entregas.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-1 text-xs font-medium">
                  Entregas en el período
                </p>
                <ul className="space-y-1 text-sm">
                  {data.actividad.entregas.map((e) => (
                    <li
                      key={e.transaccion_id}
                      className="flex flex-wrap items-start justify-between gap-2 border-b py-1.5 last:border-0"
                    >
                      <span className="min-w-0">
                        {fechaCorta(e.fecha)}
                        {e.recolector ? ` · ${e.recolector}` : ""}
                        {e.sucursales_nombres && (
                          <span className="text-muted-foreground block text-xs">
                            {e.sucursales_nombres}
                          </span>
                        )}
                      </span>
                      <span className="tabular-nums whitespace-nowrap">
                        {fmt(e.kg, "kg")} · {fmt(e.bs, "bs")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Mini({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-muted-foreground flex items-center gap-1 text-xs [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
        {label}
      </div>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
