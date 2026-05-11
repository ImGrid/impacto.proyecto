"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import {
  clientGet,
  clientPost,
  clientPatch,
  clientDelete,
} from "@/lib/client-api";
import type { Ciudad, PaginatedResponse } from "@/types/api";

export const ciudadesKeys = {
  all: ["ciudades"] as const,
  lists: () => [...ciudadesKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...ciudadesKeys.lists(), params] as const,
};

type UseCiudadesParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
  departamento_id?: number;
};

export function useCiudades(params: UseCiudadesParams = {}) {
  const {
    page = 1,
    limit = 50,
    sortOrder = "asc",
    search,
    activo,
    departamento_id,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));
  if (departamento_id)
    searchParams.set("departamento_id", String(departamento_id));

  return useQuery({
    queryKey: ciudadesKeys.list({
      page,
      limit,
      sortOrder,
      search,
      activo,
      departamento_id,
    }),
    queryFn: () =>
      clientGet<PaginatedResponse<Ciudad>>(
        `/ciudades?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateCiudad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { departamento_id: number; nombre: string }) =>
      clientPost<Ciudad>("/ciudades", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ciudadesKeys.all });
      toast.success("Ciudad creada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateCiudad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { departamento_id?: number; nombre?: string; activo?: boolean };
    }) => clientPatch<Ciudad>(`/ciudades/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ciudadesKeys.all });
      toast.success("Ciudad actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCiudad() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/ciudades/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ciudadesKeys.all });
      toast.success("Ciudad eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
