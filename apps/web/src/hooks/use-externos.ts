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
import type {
  AcopiadorCompradorExterno,
  PaginatedResponse,
} from "@/types/api";

// Catálogo global de acopiadores/compradores externos. NO son usuarios del
// sistema: no tienen login. Lectura abierta a ADMIN, ACOPIADOR y RECOLECTOR
// (estos dos últimos lo necesitan para elegir destino en una transacción).
// Las mutaciones son solo ADMIN.
export const externosKeys = {
  all: ["externos"] as const,
  lists: () => [...externosKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...externosKeys.lists(), params] as const,
};

type UseExternosParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
};

export function useExternos(params: UseExternosParams = {}) {
  const { page = 1, limit = 100, sortOrder = "asc", search, activo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));

  return useQuery({
    queryKey: externosKeys.list({ page, limit, sortOrder, search, activo }),
    queryFn: () =>
      clientGet<PaginatedResponse<AcopiadorCompradorExterno>>(
        `/externos?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateExterno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      nombre: string;
      asociacion?: string;
      telefono?: string;
      observacion?: string;
    }) => clientPost<AcopiadorCompradorExterno>("/externos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externosKeys.all });
      toast.success("Acopiador externo creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateExterno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        nombre?: string;
        asociacion?: string;
        telefono?: string;
        observacion?: string;
        activo?: boolean;
      };
    }) =>
      clientPatch<AcopiadorCompradorExterno>(`/externos/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externosKeys.all });
      toast.success("Acopiador externo actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteExterno() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/externos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: externosKeys.all });
      toast.success("Acopiador externo eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
