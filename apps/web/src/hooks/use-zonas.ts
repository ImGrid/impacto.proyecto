"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { Zona, PaginatedResponse } from "@/types/api";

// Query key factory
export const zonasKeys = {
  all: ["zonas"] as const,
  lists: () => [...zonasKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...zonasKeys.lists(), params] as const,
  mapa: () => [...zonasKeys.all, "mapa"] as const,
};

type UseZonasParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
};

export function useZonas(params: UseZonasParams = {}) {
  const { page = 1, limit = 10, sortOrder = "asc", search, activo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));

  return useQuery({
    queryKey: zonasKeys.list({ page, limit, sortOrder, search, activo }),
    queryFn: () =>
      clientGet<PaginatedResponse<Zona>>(`/zonas?${searchParams.toString()}`),
    placeholderData: keepPreviousData,
  });
}

export function useZonasMapa() {
  return useQuery({
    queryKey: zonasKeys.mapa(),
    queryFn: () => clientGet<Zona[]>("/zonas/mapa"),
  });
}

export function useCreateZona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      nombre: string;
      descripcion?: string;
      latitud?: number;
      longitud?: number;
      radio_km?: number;
    }) => clientPost<Zona>("/zonas", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zonasKeys.all });
      toast.success("Zona creada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateZona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        nombre?: string;
        descripcion?: string;
        latitud?: number | null;
        longitud?: number | null;
        radio_km?: number | null;
        activo?: boolean;
      };
    }) => clientPatch<Zona>(`/zonas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zonasKeys.all });
      toast.success("Zona actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteZona() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/zonas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: zonasKeys.all });
      toast.success("Zona eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
