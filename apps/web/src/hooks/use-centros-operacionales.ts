"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { clientGet, clientPost, clientPatch, clientDelete } from "@/lib/client-api";
import type {
  CentroOperacional,
  TipoAcopio,
  PaginatedResponse,
} from "@/types/api";

export const centrosOperacionalesKeys = {
  all: ["centros-operacionales"] as const,
  lists: () => [...centrosOperacionalesKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...centrosOperacionalesKeys.lists(), params] as const,
  mapa: () => [...centrosOperacionalesKeys.all, "mapa"] as const,
};

type UseCentrosOperacionalesParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
  zona_id?: number;
  departamento_id?: number;
  tipo_acopio?: string;
};

export function useCentrosOperacionales(
  params: UseCentrosOperacionalesParams = {},
) {
  const {
    page = 1,
    limit = 10,
    sortOrder = "asc",
    search,
    activo,
    zona_id,
    departamento_id,
    tipo_acopio,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));
  if (zona_id) searchParams.set("zona_id", String(zona_id));
  if (departamento_id)
    searchParams.set("departamento_id", String(departamento_id));
  if (tipo_acopio) searchParams.set("tipo_acopio", tipo_acopio);

  return useQuery({
    queryKey: centrosOperacionalesKeys.list({
      page,
      limit,
      sortOrder,
      search,
      activo,
      zona_id,
      departamento_id,
      tipo_acopio,
    }),
    queryFn: () =>
      clientGet<PaginatedResponse<CentroOperacional>>(
        `/centros-operacionales?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

// Forma del item del mapa devuelto por GET /centros-operacionales/mapa.
// Verificado contra `centros-operacionales.service.ts#findAllForMap`.
type CentroOperacionalMapa = {
  id: number;
  nombre_completo: string;
  nombre_punto: string;
  tipo_acopio: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  zona: { nombre: string };
  departamento: { nombre: string };
};

export function useCentrosOperacionalesMapa() {
  return useQuery({
    queryKey: centrosOperacionalesKeys.mapa(),
    queryFn: () =>
      clientGet<CentroOperacionalMapa[]>("/centros-operacionales/mapa"),
  });
}

export function useCreateCentroOperacional() {
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
    }) => clientPost("/centros-operacionales", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: centrosOperacionalesKeys.all });
      toast.success("Centro operacional creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateCentroOperacional() {
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
    }) => clientPatch<CentroOperacional>(`/centros-operacionales/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: centrosOperacionalesKeys.all });
      toast.success("Centro operacional actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteCentroOperacional() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/centros-operacionales/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: centrosOperacionalesKeys.all });
      toast.success("Centro operacional eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
