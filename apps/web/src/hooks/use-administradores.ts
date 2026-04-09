"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { Administrador, PaginatedResponse } from "@/types/api";

export const administradoresKeys = {
  all: ["administradores"] as const,
  lists: () => [...administradoresKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...administradoresKeys.lists(), params] as const,
};

type UseAdministradoresParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
};

export function useAdministradores(params: UseAdministradoresParams = {}) {
  const { page = 1, limit = 10, sortOrder = "asc", search, activo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));

  return useQuery({
    queryKey: administradoresKeys.list({ page, limit, sortOrder, search, activo }),
    queryFn: () =>
      clientGet<PaginatedResponse<Administrador>>(
        `/administradores?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateAdministrador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      nombre_completo: string;
      telefono: string;
    }) => clientPost("/administradores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: administradoresKeys.lists(),
      });
      toast.success("Administrador creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAdministrador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        nombre_completo?: string;
        telefono?: string;
        activo?: boolean;
      };
    }) => clientPatch<Administrador>(`/administradores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: administradoresKeys.lists(),
      });
      toast.success("Administrador actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAdministrador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/administradores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: administradoresKeys.lists(),
      });
      toast.success("Administrador eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
