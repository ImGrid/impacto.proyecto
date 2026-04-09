"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { Asociacion, PaginatedResponse } from "@/types/api";

export const asociacionesKeys = {
  all: ["asociaciones"] as const,
  lists: () => [...asociacionesKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...asociacionesKeys.lists(), params] as const,
};

type UseAsociacionesParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
};

export function useAsociaciones(params: UseAsociacionesParams = {}) {
  const { page = 1, limit = 10, sortOrder = "asc", search, activo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));

  return useQuery({
    queryKey: asociacionesKeys.list({ page, limit, sortOrder, search, activo }),
    queryFn: () =>
      clientGet<PaginatedResponse<Asociacion>>(
        `/asociaciones?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateAsociacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      nombre: string;
      representante?: string;
      telefono?: string;
      direccion?: string;
    }) => clientPost<Asociacion>("/asociaciones", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: asociacionesKeys.lists() });
      toast.success("Asociación creada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAsociacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        nombre?: string;
        representante?: string;
        telefono?: string;
        direccion?: string;
        activo?: boolean;
      };
    }) => clientPatch<Asociacion>(`/asociaciones/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: asociacionesKeys.lists() });
      toast.success("Asociación actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAsociacion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/asociaciones/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: asociacionesKeys.lists() });
      toast.success("Asociación eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
