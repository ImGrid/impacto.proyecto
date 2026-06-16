"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { Material, PaginatedResponse, UnidadMedida } from "@/types/api";

export const materialesKeys = {
  all: ["materiales"] as const,
  lists: () => [...materialesKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...materialesKeys.lists(), params] as const,
};

type UseMaterialesParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
};

export function useMateriales(params: UseMaterialesParams = {}) {
  const { page = 1, limit = 10, sortOrder = "asc", search, activo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));

  return useQuery({
    queryKey: materialesKeys.list({ page, limit, sortOrder, search, activo }),
    queryFn: () =>
      clientGet<PaginatedResponse<Material>>(
        `/materiales?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreateMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      nombre: string;
      descripcion?: string;
      unidad_medida_default?: UnidadMedida;
      factor_co2?: number;
      peso_unitario_kg?: number;
    }) => clientPost<Material>("/materiales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialesKeys.lists() });
      toast.success("Material creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateMaterial() {
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
        unidad_medida_default?: UnidadMedida;
        factor_co2?: number;
        peso_unitario_kg?: number;
        activo?: boolean;
      };
    }) => clientPatch<Material>(`/materiales/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialesKeys.lists() });
      toast.success("Material actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Respuesta del endpoint de sugerencia de factor de CO₂. Es SOLO sugerencia:
 * el admin la confirma, edita o ignora. Nunca se aplica sola.
 */
export type SugerenciaFactor =
  | { encontrado: false }
  | {
      encontrado: true;
      material_canonico: string;
      factor_co2: number;
      unidad: "KG" | "UNIDAD";
      peso_unitario_kg: number | null;
      fuente: string;
      anio: number;
      confianza: "alta" | "media" | "baja";
      metodo: "exacto" | "aproximado";
      nota?: string;
    };

/** Pide al backend una sugerencia de factor de CO₂ según el nombre del material. */
export function sugerirFactorMaterial(nombre: string) {
  return clientGet<SugerenciaFactor>(
    `/materiales/sugerir-factor?nombre=${encodeURIComponent(nombre)}`,
  );
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/materiales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialesKeys.lists() });
      toast.success("Material eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
