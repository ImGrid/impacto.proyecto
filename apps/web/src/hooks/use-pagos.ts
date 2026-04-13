"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { clientGet } from "@/lib/client-api";
import type { Pago, PaginatedResponse } from "@/types/api";

export const pagosKeys = {
  all: ["pagos"] as const,
  lists: () => [...pagosKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...pagosKeys.lists(), params] as const,
  detail: (id: number) => [...pagosKeys.all, "detail", id] as const,
};

type UsePagosParams = {
  page?: number;
  limit?: number;
  recolector_id?: number;
  acopiador_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
};

export function usePagos(params: UsePagosParams = {}) {
  const { page = 1, limit = 10, recolector_id, acopiador_id, fecha_desde, fecha_hasta } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  if (recolector_id) searchParams.set("recolector_id", String(recolector_id));
  if (acopiador_id) searchParams.set("acopiador_id", String(acopiador_id));
  if (fecha_desde) searchParams.set("fecha_desde", fecha_desde);
  if (fecha_hasta) searchParams.set("fecha_hasta", fecha_hasta);

  return useQuery({
    queryKey: pagosKeys.list({ page, limit, recolector_id, acopiador_id, fecha_desde, fecha_hasta }),
    queryFn: () =>
      clientGet<PaginatedResponse<Pago>>(
        `/pagos?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function usePagoDetalle(id: number | null) {
  return useQuery({
    queryKey: pagosKeys.detail(id ?? 0),
    queryFn: () => clientGet<Pago>(`/pagos/${id}`),
    enabled: !!id,
  });
}
