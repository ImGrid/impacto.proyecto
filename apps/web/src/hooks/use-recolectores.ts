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
  Recolector,
  Genero,
  DiaSemana,
  PaginatedResponse,
} from "@/types/api";

export const recolectoresKeys = {
  all: ["recolectores"] as const,
  lists: () => [...recolectoresKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...recolectoresKeys.lists(), params] as const,
  mapa: () => [...recolectoresKeys.all, "mapa"] as const,
};

type UseRecolectoresParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
  zona_id?: number;
  acopiador_id?: number;
  asociacion_id?: number;
  genero?: string;
  trabaja_individual?: boolean;
  material_id?: number;
};

export function useRecolectores(params: UseRecolectoresParams = {}) {
  const {
    page = 1, limit = 10, sortOrder = "asc", search,
    activo, zona_id, acopiador_id, asociacion_id, genero,
    trabaja_individual, material_id,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));
  if (zona_id) searchParams.set("zona_id", String(zona_id));
  if (acopiador_id) searchParams.set("acopiador_id", String(acopiador_id));
  if (asociacion_id) searchParams.set("asociacion_id", String(asociacion_id));
  if (genero) searchParams.set("genero", genero);
  if (trabaja_individual !== undefined) searchParams.set("trabaja_individual", String(trabaja_individual));
  if (material_id) searchParams.set("material_id", String(material_id));

  return useQuery({
    queryKey: recolectoresKeys.list({
      page, limit, sortOrder, search, activo, zona_id, acopiador_id,
      asociacion_id, genero, trabaja_individual, material_id,
    }),
    queryFn: () =>
      clientGet<PaginatedResponse<Recolector>>(
        `/recolectores?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

type RecolectorMapa = {
  id: number;
  nombre_completo: string;
  direccion_domicilio: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  acopiador: { nombre_completo: string };
  zona: { nombre: string };
};

export function useRecolectoresMapa() {
  return useQuery({
    queryKey: recolectoresKeys.mapa(),
    queryFn: () => clientGet<RecolectorMapa[]>("/recolectores/mapa"),
  });
}

type RecolectorMaterialInput = {
  material_id: number;
  cantidad_mensual?: number;
  precio_venta?: number;
  es_principal?: boolean;
};

export function useCreateRecolector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      nombre_completo: string;
      cedula_identidad: string;
      celular: string;
      direccion_domicilio: string;
      latitud: number;
      longitud: number;
      acopiador_id: number;
      zona_id: number;
      genero: Genero;
      edad: number;
      asociacion_id?: number;
      trabaja_individual?: boolean;
      dias_trabajo?: DiaSemana[];
      materiales?: RecolectorMaterialInput[];
      tipos_generador_ids?: number[];
    }) => clientPost("/recolectores", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recolectoresKeys.all });
      toast.success("Recolector creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateRecolector() {
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
        direccion_domicilio?: string;
        latitud?: number;
        longitud?: number;
        acopiador_id?: number;
        zona_id?: number;
        genero?: Genero;
        edad?: number;
        asociacion_id?: number;
        trabaja_individual?: boolean;
        dias_trabajo?: DiaSemana[];
        materiales?: RecolectorMaterialInput[];
        tipos_generador_ids?: number[];
        activo?: boolean;
      };
    }) => clientPatch<Recolector>(`/recolectores/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recolectoresKeys.all });
      toast.success("Recolector actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteRecolector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => clientDelete(`/recolectores/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: recolectoresKeys.all });
      toast.success("Recolector eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
