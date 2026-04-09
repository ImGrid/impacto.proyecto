"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { TipoGenerador, PaginatedResponse } from "@/types/api";

export const tiposGeneradorKeys = {
  all: ["tipos-generador"] as const,
  lists: () => [...tiposGeneradorKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...tiposGeneradorKeys.lists(), params] as const,
};

type UseTiposGeneradorParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
};

export function useTiposGenerador(params: UseTiposGeneradorParams = {}) {
  const { page = 1, limit = 10, sortOrder = "asc", search, activo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));

  return useQuery({
    queryKey: tiposGeneradorKeys.list({ page, limit, sortOrder, search, activo }),
    queryFn: () =>
      clientGet<PaginatedResponse<TipoGenerador>>(
        `/tipos-generador?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateTipoGenerador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { nombre: string; descripcion?: string }) =>
      clientPost<TipoGenerador>("/tipos-generador", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tiposGeneradorKeys.lists() });
      toast.success("Tipo de generador creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateTipoGenerador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { nombre?: string; descripcion?: string; activo?: boolean };
    }) => clientPatch<TipoGenerador>(`/tipos-generador/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tiposGeneradorKeys.lists() });
      toast.success("Tipo de generador actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTipoGenerador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/tipos-generador/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tiposGeneradorKeys.lists() });
      toast.success("Tipo de generador eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
