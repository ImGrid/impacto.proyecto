"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { Acopiador, TipoAcopio, PaginatedResponse } from "@/types/api";

export const acopiadoresKeys = {
  all: ["acopiadores"] as const,
  lists: () => [...acopiadoresKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...acopiadoresKeys.lists(), params] as const,
  mapa: () => [...acopiadoresKeys.all, "mapa"] as const,
};

type UseAcopiadoresParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
  zona_id?: number;
  tipo_acopio?: string;
};

export function useAcopiadores(params: UseAcopiadoresParams = {}) {
  const { page = 1, limit = 10, sortOrder = "asc", search, activo, zona_id, tipo_acopio } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));
  if (zona_id) searchParams.set("zona_id", String(zona_id));
  if (tipo_acopio) searchParams.set("tipo_acopio", tipo_acopio);

  return useQuery({
    queryKey: acopiadoresKeys.list({ page, limit, sortOrder, search, activo, zona_id, tipo_acopio }),
    queryFn: () =>
      clientGet<PaginatedResponse<Acopiador>>(
        `/acopiadores?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

type AcopiadorMapa = {
  id: number;
  nombre_completo: string;
  nombre_punto: string;
  tipo_acopio: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  zona: { nombre: string };
};

export function useAcopiadoresMapa() {
  return useQuery({
    queryKey: acopiadoresKeys.mapa(),
    queryFn: () => clientGet<AcopiadorMapa[]>("/acopiadores/mapa"),
  });
}

export function useCreateAcopiador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      nombre_completo: string;
      cedula_identidad: string;
      celular: string;
      tipo_acopio: TipoAcopio;
      nombre_punto: string;
      zona_id: number;
      direccion?: string;
      latitud?: number;
      longitud?: number;
      horario_operacion?: string;
    }) => clientPost("/acopiadores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acopiadoresKeys.all });
      toast.success("Acopiador creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateAcopiador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        nombre_completo?: string;
        cedula_identidad?: string;
        celular?: string;
        tipo_acopio?: TipoAcopio;
        nombre_punto?: string;
        zona_id?: number;
        direccion?: string;
        latitud?: number;
        longitud?: number;
        horario_operacion?: string;
        activo?: boolean;
      };
    }) => clientPatch<Acopiador>(`/acopiadores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acopiadoresKeys.all });
      toast.success("Acopiador actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteAcopiador() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/acopiadores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: acopiadoresKeys.all });
      toast.success("Acopiador eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
