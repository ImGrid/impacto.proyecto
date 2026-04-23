"use client";

import { useQuery } from "@tanstack/react-query";
import { clientGet } from "@/lib/client-api";
import type { DashboardData } from "@/types/api";

export const dashboardKeys = {
  all: ["dashboard"] as const,
};

/**
 * Dashboard del admin: KPIs del mes actual, alertas operacionales,
 * serie de 6 meses, distribución por material y tops.
 *
 * Se refresca cada 2 minutos para que los datos del mes en curso
 * reflejen lo que el acopiador registra desde el móvil.
 */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.all,
    queryFn: () => clientGet<DashboardData>("/dashboard"),
    refetchInterval: 2 * 60 * 1000,
    staleTime: 30 * 1000,
  });
}
