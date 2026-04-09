"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type { PrecioMaterial, PaginatedResponse } from "@/types/api";

export const preciosMaterialKeys = {
  all: ["precios-material"] as const,
  lists: () => [...preciosMaterialKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...preciosMaterialKeys.lists(), params] as const,
};

type UsePreciosMaterialParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  material_id?: number;
  vigencia?: "vigentes" | "vencidos" | "todos";
};

export function usePreciosMaterial(params: UsePreciosMaterialParams = {}) {
  const {
    page = 1,
    limit = 10,
    sortOrder = "asc",
    search,
    material_id,
    vigencia,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (material_id) searchParams.set("material_id", String(material_id));
  if (vigencia) searchParams.set("vigencia", vigencia);

  return useQuery({
    queryKey: preciosMaterialKeys.list({
      page,
      limit,
      sortOrder,
      search,
      material_id,
      vigencia,
    }),
    queryFn: () =>
      clientGet<PaginatedResponse<PrecioMaterial>>(
        `/precios-material?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useCreatePrecioMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      material_id: number;
      precio_minimo: number;
      precio_maximo: number;
      fecha_inicio: string;
      fecha_fin?: string;
    }) => clientPost<PrecioMaterial>("/precios-material", data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preciosMaterialKeys.lists(),
      });
      toast.success("Precio creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdatePrecioMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: {
        precio_minimo?: number;
        precio_maximo?: number;
        fecha_inicio?: string;
        fecha_fin?: string | null;
      };
    }) => clientPatch<PrecioMaterial>(`/precios-material/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preciosMaterialKeys.lists(),
      });
      toast.success("Precio actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeletePrecioMaterial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/precios-material/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: preciosMaterialKeys.lists(),
      });
      toast.success("Precio eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
