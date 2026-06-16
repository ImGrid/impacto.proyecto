"use client";

import { useQuery } from "@tanstack/react-query";
import { clientGet } from "@/lib/client-api";
import { useDepartamentoActivo } from "@/components/departamento-context";

function buildQuery(filters: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Hook genérico para los reportes (`GET /reportes/<endpoint>`). Incluye el
 * departamento activo en la query key para refrescar al cambiar de depto (el
 * backend scope-a por el JWT). El proxy BFF (`/api/[...path]`) reenvía la
 * petición a NestJS con el token de la cookie.
 */
export function useReporte<T>(
  endpoint: string,
  filters: Record<string, unknown>,
  options?: { enabled?: boolean },
) {
  const departamentoActivo = useDepartamentoActivo();
  return useQuery({
    queryKey: ["reporte", endpoint, departamentoActivo, filters],
    queryFn: () =>
      clientGet<T>(`/reportes/${endpoint}${buildQuery(filters)}`),
    staleTime: 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
