"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { Evento, PaginatedResponse } from "@/types/api";

export const eventosKeys = {
  all: ["eventos"] as const,
  lists: () => [...eventosKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...eventosKeys.lists(), params] as const,
};

type UseEventosParams = {
  page?: number;
  limit?: number;
  search?: string;
  zona_id?: number;
  activo?: boolean;
};

export function useEventos(params: UseEventosParams = {}) {
  const { page = 1, limit = 10, search, zona_id, activo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  if (search) searchParams.set("search", search);
  if (zona_id) searchParams.set("zona_id", String(zona_id));
  if (activo !== undefined) searchParams.set("activo", String(activo));

  return useQuery({
    queryKey: eventosKeys.list({ page, limit, search, zona_id, activo }),
    queryFn: () =>
      clientGet<PaginatedResponse<Evento>>(
        `/eventos?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      titulo: string;
      descripcion?: string;
      zona_id: number;
      direccion?: string;
      latitud?: number;
      longitud?: number;
      fecha_evento: string;
      hora_inicio?: string;
      hora_fin?: string;
    }) => clientPost<Evento>("/eventos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventosKeys.lists() });
      toast.success("Evento creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        titulo?: string;
        descripcion?: string;
        zona_id?: number;
        direccion?: string;
        latitud?: number;
        longitud?: number;
        fecha_evento?: string;
        hora_inicio?: string;
        hora_fin?: string;
      };
    }) => clientPatch<Evento>(`/eventos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventosKeys.lists() });
      toast.success("Evento actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteEvento() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/eventos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventosKeys.lists() });
      toast.success("Evento eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
