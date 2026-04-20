"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost } from "@/lib/client-api";
import type {
  Transaccion,
  TransaccionDetalle,
  PaginatedResponse,
  EstadoTransaccion,
  CreateTransaccionInput,
} from "@/types/api";

export const transaccionesKeys = {
  all: ["transacciones"] as const,
  lists: () => [...transaccionesKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...transaccionesKeys.lists(), params] as const,
  detail: (id: number) => [...transaccionesKeys.all, "detail", id] as const,
};

type UseTransaccionesParams = {
  page?: number;
  limit?: number;
  estado?: EstadoTransaccion;
  zona_id?: number;
  recolector_id?: number;
  acopiador_id?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
};

export function useTransacciones(params: UseTransaccionesParams = {}) {
  const { page = 1, limit = 10, estado, zona_id, recolector_id, acopiador_id, fecha_desde, fecha_hasta } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  if (estado) searchParams.set("estado", estado);
  if (zona_id) searchParams.set("zona_id", String(zona_id));
  if (recolector_id) searchParams.set("recolector_id", String(recolector_id));
  if (acopiador_id) searchParams.set("acopiador_id", String(acopiador_id));
  if (fecha_desde) searchParams.set("fecha_desde", fecha_desde);
  if (fecha_hasta) searchParams.set("fecha_hasta", fecha_hasta);

  return useQuery({
    queryKey: transaccionesKeys.list({ page, limit, estado, zona_id, recolector_id, acopiador_id, fecha_desde, fecha_hasta }),
    queryFn: () =>
      clientGet<PaginatedResponse<Transaccion>>(
        `/transacciones?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useTransaccionDetalle(id: number | null) {
  return useQuery({
    queryKey: transaccionesKeys.detail(id ?? 0),
    queryFn: () => clientGet<TransaccionDetalle>(`/transacciones/${id}`),
    enabled: !!id,
  });
}

export function useCreateTransaccion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransaccionInput) =>
      clientPost<TransaccionDetalle>("/transacciones", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transaccionesKeys.lists() });
      toast.success("Transacción creada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
