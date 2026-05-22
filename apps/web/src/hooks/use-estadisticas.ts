"use client";

import { useQuery } from "@tanstack/react-query";
import { clientGet } from "@/lib/client-api";
import type { EstadisticasData, EstadisticasFilters } from "@/types/api";

export const estadisticasKeys = {
  all: ["estadisticas"] as const,
  filtered: (f: EstadisticasFilters) =>
    [...estadisticasKeys.all, f] as const,
};

function buildQuery(filters: EstadisticasFilters): string {
  const params = new URLSearchParams();
  if (filters.desde) params.set("desde", filters.desde);
  if (filters.hasta) params.set("hasta", filters.hasta);
  if (filters.zona_id != null)
    params.set("zona_id", String(filters.zona_id));
  if (filters.ciudad_id != null)
    params.set("ciudad_id", String(filters.ciudad_id));
  if (filters.material_id != null)
    params.set("material_id", String(filters.material_id));
  if (filters.tipo_generador_id != null)
    params.set("tipo_generador_id", String(filters.tipo_generador_id));
  if (filters.tipo_destino != null)
    params.set("tipo_destino", filters.tipo_destino);
  if (filters.recolector_id != null)
    params.set("recolector_id", String(filters.recolector_id));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Estadísticas analíticas del rango filtrado. A diferencia del dashboard,
 * se refresca solo cuando cambian los filtros (no cada 2 min) — el
 * usuario tiene control explícito del rango.
 */
export function useEstadisticas(filters: EstadisticasFilters) {
  return useQuery({
    queryKey: estadisticasKeys.filtered(filters),
    queryFn: () =>
      clientGet<EstadisticasData>(`/estadisticas${buildQuery(filters)}`),
    staleTime: 60 * 1000,
  });
}
