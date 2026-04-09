"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientDelete } from "@/lib/client-api";
import type { Notificacion, PaginatedResponse } from "@/types/api";

export const notificacionesKeys = {
  all: ["notificaciones"] as const,
  lists: () => [...notificacionesKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...notificacionesKeys.lists(), params] as const,
};

type UseNotificacionesParams = {
  page?: number;
  limit?: number;
  search?: string;
  zona_id?: number;
  tipo?: string;
};

export function useNotificaciones(params: UseNotificacionesParams = {}) {
  const { page = 1, limit = 10, search, zona_id, tipo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  if (search) searchParams.set("search", search);
  if (zona_id) searchParams.set("zona_id", String(zona_id));
  if (tipo) searchParams.set("tipo", tipo);

  return useQuery({
    queryKey: notificacionesKeys.list({ page, limit, search, zona_id, tipo }),
    queryFn: () =>
      clientGet<PaginatedResponse<Notificacion>>(
        `/notificaciones?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateNotificacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      titulo: string;
      mensaje?: string;
      zona_id?: number;
      receptor_ids?: number[];
    }) => clientPost<Notificacion | Notificacion[]>("/notificaciones", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificacionesKeys.lists(),
      });
      toast.success("Notificación enviada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteNotificacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/notificaciones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: notificacionesKeys.lists(),
      });
      toast.success("Notificación eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
