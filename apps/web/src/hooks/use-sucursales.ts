"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { Sucursal, FrecuenciaRecojo, DiaSemana, PaginatedResponse } from "@/types/api";

export const sucursalesKeys = {
  all: ["sucursales"] as const,
  lists: () => [...sucursalesKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...sucursalesKeys.lists(), params] as const,
};

type UseSucursalesParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
  zona_id?: number;
  frecuencia?: string;
  generador_id?: number;
};

export function useSucursales(params: UseSucursalesParams = {}) {
  const { page = 1, limit = 10, sortOrder = "asc", search, activo, zona_id, frecuencia, generador_id } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));
  if (zona_id) searchParams.set("zona_id", String(zona_id));
  if (frecuencia) searchParams.set("frecuencia", frecuencia);
  if (generador_id) searchParams.set("generador_id", String(generador_id));

  return useQuery({
    queryKey: sucursalesKeys.list({ page, limit, sortOrder, search, activo, zona_id, frecuencia, generador_id }),
    queryFn: () =>
      clientGet<PaginatedResponse<Sucursal>>(
        `/sucursales?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

type SucursalMaterialInput = {
  material_id: number;
  cantidad_aproximada?: string;
};

type SucursalHorarioInput = {
  dia_semana: DiaSemana;
  hora_inicio: string;
  hora_fin: string;
};

export function useCreateSucursal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      generador_id: number;
      nombre: string;
      direccion: string;
      latitud: number;
      longitud: number;
      zona_id: number;
      horario_recojo?: string;
      frecuencia?: FrecuenciaRecojo;
      materiales?: SucursalMaterialInput[];
      horarios?: SucursalHorarioInput[];
    }) => clientPost("/sucursales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sucursalesKeys.lists() });
      toast.success("Sucursal creada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateSucursal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        nombre?: string;
        direccion?: string;
        latitud?: number;
        longitud?: number;
        zona_id?: number;
        horario_recojo?: string;
        frecuencia?: FrecuenciaRecojo;
        materiales?: SucursalMaterialInput[];
        horarios?: SucursalHorarioInput[];
        activo?: boolean;
      };
    }) => clientPatch<Sucursal>(`/sucursales/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sucursalesKeys.lists() });
      toast.success("Sucursal actualizada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteSucursal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/sucursales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sucursalesKeys.lists() });
      toast.success("Sucursal eliminada exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
