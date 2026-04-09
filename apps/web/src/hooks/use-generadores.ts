"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { Generador, PaginatedResponse } from "@/types/api";

export const generadoresKeys = {
  all: ["generadores"] as const,
  lists: () => [...generadoresKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...generadoresKeys.lists(), params] as const,
  mapa: () => [...generadoresKeys.all, "mapa"] as const,
};

type UseGeneradoresParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
  tipo_generador_id?: number;
};

export function useGeneradores(params: UseGeneradoresParams = {}) {
  const { page = 1, limit = 10, sortOrder = "asc", search, activo, tipo_generador_id } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));
  if (tipo_generador_id) searchParams.set("tipo_generador_id", String(tipo_generador_id));

  return useQuery({
    queryKey: generadoresKeys.list({ page, limit, sortOrder, search, activo, tipo_generador_id }),
    queryFn: () =>
      clientGet<PaginatedResponse<Generador>>(
        `/generadores?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

type GeneradorMapa = {
  id: number;
  razon_social: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  tipo_generador: { nombre: string };
};

export function useGeneradoresMapa() {
  return useQuery({
    queryKey: generadoresKeys.mapa(),
    queryFn: () => clientGet<GeneradorMapa[]>("/generadores/mapa"),
  });
}

export function useCreateGenerador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      razon_social: string;
      tipo_generador_id: number;
      contacto_nombre: string;
      contacto_telefono: string;
      contacto_email?: string;
      latitud?: number;
      longitud?: number;
    }) => clientPost("/generadores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generadoresKeys.all });
      toast.success("Generador creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateGenerador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        razon_social?: string;
        tipo_generador_id?: number;
        contacto_nombre?: string;
        contacto_telefono?: string;
        contacto_email?: string;
        latitud?: number | null;
        longitud?: number | null;
        activo?: boolean;
      };
    }) => clientPatch<Generador>(`/generadores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generadoresKeys.all });
      toast.success("Generador actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteGenerador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/generadores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: generadoresKeys.all });
      toast.success("Generador eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
