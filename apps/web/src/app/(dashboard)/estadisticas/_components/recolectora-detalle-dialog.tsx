"use client";

import { Loader2, MapPin, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useRecolectorDetalle } from "@/hooks/use-recolectores";
import { useEstadisticas } from "@/hooks/use-estadisticas";
import type { EstadisticasFilters } from "@/types/api";
import { EvolucionDiariaChart } from "./evolucion-diaria-chart";

interface RecolectoraDetalleDialogProps {
  recolectoraId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Filtros activos de la página: el perfil respeta el mismo contexto. */
  filters: EstadisticasFilters;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("es-BO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/**
 * Modal de perfil de una recolectora (drill-through desde el ranking o la
 * tabla de Estadísticas). Es solo lectura. NO es un filtro de la página: la
 * página de Estadísticas sigue siendo un panorama; este modal es la capa
 * "details-on-demand" de una entidad concreta.
 *
 * Se eligió un modal centrado (en vez de un panel lateral) porque el
 * contenido es para leer — incluye un gráfico — y un modal le da el ancho
 * necesario. Además es consistente con el detalle de transacción de la app.
 *
 * Muestra las métricas de esa recolectora dentro del MISMO rango/filtros
 * que el usuario tiene aplicados en la página.
 */
export function RecolectoraDetalleDialog({
  recolectoraId,
  open,
  onOpenChange,
  filters,
}: RecolectoraDetalleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Perfil de recolectora</DialogTitle>
          <DialogDescription>
            Estadísticas de la recolectora dentro del rango y filtros activos.
          </DialogDescription>
        </DialogHeader>
        {recolectoraId != null && (
          <DetalleBody recolectoraId={recolectoraId} filters={filters} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetalleBody({
  recolectoraId,
  filters,
}: {
  recolectoraId: number;
  filters: EstadisticasFilters;
}) {
  const { data: perfil, isLoading: perfilLoading } =
    useRecolectorDetalle(recolectoraId);
  const { data: stats, isLoading: statsLoading } = useEstadisticas({
    ...filters,
    recolector_id: recolectoraId,
  });

  if (perfilLoading || statsLoading) {
    return (
      <div className="text-muted-foreground flex items-center justify-center gap-2 py-12 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando perfil...
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="text-muted-foreground py-12 text-center text-sm">
        No se pudo cargar la recolectora.
      </div>
    );
  }

  const kpis = stats?.kpis;

  return (
    <div className="space-y-5">
      {/* Identidad */}
      <div>
        <h3 className="text-lg font-semibold">{perfil.nombre_completo}</h3>
        <p className="text-muted-foreground text-sm">
          CI: {perfil.cedula_identidad}
        </p>
      </div>

      {/* Datos del perfil */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="gap-1">
          <MapPin className="h-3 w-3" />
          {perfil.zona.nombre}
        </Badge>
        <Badge variant="secondary">{perfil.departamento.nombre}</Badge>
        <Badge variant="secondary" className="gap-1">
          <Users className="h-3 w-3" />
          {perfil.asociacion
            ? perfil.asociacion.nombre
            : "Trabaja individual"}
        </Badge>
        {!perfil.activo && <Badge variant="outline">Inactiva</Badge>}
      </div>

      {/* Resumen del rango */}
      <div>
        <h4 className="mb-2 text-sm font-medium">Resumen del rango</h4>
        <div className="grid grid-cols-3 gap-2">
          <StatTile
            label="Recolectado"
            value={fmt(kpis?.total_recolectado_kg ?? 0)}
            unit="kg"
          />
          <StatTile
            label="Generado"
            value={fmt(kpis?.total_generado_bs ?? 0)}
            unit="Bs"
          />
          <StatTile
            label="CO₂ evitado"
            value={fmt(kpis?.co2_evitado_kg ?? 0)}
            unit="kg"
          />
        </div>
      </div>

      {/* Evolución de la recolectora */}
      {stats && <EvolucionDiariaChart items={stats.evolucion_diaria} />}

      {/* Materiales entregados por la recolectora en el rango */}
      <div>
        <h4 className="mb-2 text-sm font-medium">Materiales entregados</h4>
        {stats && stats.por_material.length > 0 ? (
          <ul className="divide-border divide-y rounded-md border">
            {stats.por_material.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
              >
                <span>{m.nombre}</span>
                <span className="font-medium tabular-nums">
                  {fmt(m.kg)} kg
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Sin materiales registrados en el rango.
          </p>
        )}
      </div>
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="bg-muted/40 rounded-md border p-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 text-base font-semibold tabular-nums">
        {value}
        <span className="text-muted-foreground ml-1 text-xs font-normal">
          {unit}
        </span>
      </p>
    </div>
  );
}
