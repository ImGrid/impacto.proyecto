"use client";

import { Recycle, Wallet, Leaf, Boxes, FileSpreadsheet, FileText } from "lucide-react";
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
import type { ReporteSucursalDetalle } from "@/types/reportes";
import { fmt, fmtNum } from "../../_components/format";

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-BO", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function SucursalDetalleDialog({
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
  const { data, isLoading } = useReporte<ReporteSucursalDetalle>(
    `sucursales/${id ?? 0}`,
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
    a.href = `/api/reportes/sucursales/${id}/export?${params.toString()}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{data?.perfil.nombre ?? "Sucursal"}</DialogTitle>
          <DialogDescription>
            {data
              ? `${data.perfil.generador} · ${data.perfil.tipo_generador}${data.perfil.ciudad ? ` · ${data.perfil.ciudad}` : ""}${data.perfil.zona ? ` · ${data.perfil.zona}` : ""}`
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
          <>
            {/* DATOS */}
            <section className="space-y-1 text-sm">
              <h3 className="text-sm font-semibold">Datos</h3>
              <p className="text-muted-foreground">
                Dirección:{" "}
                <span className="text-foreground">{data.perfil.direccion}</span>
              </p>
              {data.perfil.horario && (
                <p className="text-muted-foreground">
                  Horario:{" "}
                  <span className="text-foreground">{data.perfil.horario}</span>
                </p>
              )}
              <p className="text-muted-foreground">
                Departamento:{" "}
                <span className="text-foreground">
                  {data.perfil.departamento ?? "—"}
                </span>
              </p>
            </section>

            {/* ACTIVIDAD REAL */}
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">
                Actividad real{" "}
                <span className="text-muted-foreground font-normal">
                  (lo que recolectó en el período)
                </span>
              </h3>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini icon={<Boxes />} label="Entregas" value={fmtNum(data.actividad.total.transacciones, 0)} />
                <Mini icon={<Recycle />} label="Recolectado" value={`${fmtNum(data.actividad.total.kg, 2)} kg`} />
                <Mini icon={<Leaf />} label="CO₂ evitado" value={`${fmtNum(data.actividad.total.co2_kg, 2)} kg`} />
                <Mini icon={<Wallet />} label="Generado" value={`Bs ${fmtNum(data.actividad.total.bs, 2)}`} />
              </div>

              {data.actividad.por_material.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Qué recolectó exactamente
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

              {data.actividad.entregas.length > 0 && (
                <div>
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Entregas en el período
                  </p>
                  <ul className="space-y-1 text-sm">
                    {data.actividad.entregas.map((e) => (
                      <li
                        key={e.transaccion_id}
                        className="flex flex-wrap items-center justify-between gap-2 border-b py-1 last:border-0"
                      >
                        <span>
                          {fechaCorta(e.fecha)}
                          {e.recolector ? ` · ${e.recolector}` : ""}
                        </span>
                        <span className="tabular-nums">
                          {fmt(e.kg, "kg")} · {fmt(e.bs, "bs")}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </>
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
