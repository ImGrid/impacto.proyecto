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
  UnidadMedida,
} from "@/types/api";

export const recolectoresKeys = {
  all: ["recolectores"] as const,
  lists: () => [...recolectoresKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...recolectoresKeys.lists(), params] as const,
  mapa: () => [...recolectoresKeys.all, "mapa"] as const,
  detail: (id: number) => [...recolectoresKeys.all, "detail", id] as const,
};

// El backend filtra automáticamente por el departamento activo de la sesión
// (`departamento_activo` del JWT). El filtro `acopiador_id` ya no existe:
// el vínculo fijo recolector ↔ centro operacional se eliminó con el cambio
// definitivo. Verificado en `apps/api/src/recolectores/dto/recolector-query.dto.ts`.
type UseRecolectoresParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
  zona_id?: number;
  asociacion_id?: number;
  genero?: string;
  trabaja_individual?: boolean;
  material_id?: number;
};

export function useRecolectores(params: UseRecolectoresParams = {}) {
  const {
    page = 1,
    limit = 10,
    sortOrder = "asc",
    search,
    activo,
    zona_id,
    asociacion_id,
    genero,
    trabaja_individual,
    material_id,
  } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));
  if (zona_id) searchParams.set("zona_id", String(zona_id));
  if (asociacion_id) searchParams.set("asociacion_id", String(asociacion_id));
  if (genero) searchParams.set("genero", genero);
  if (trabaja_individual !== undefined)
    searchParams.set("trabaja_individual", String(trabaja_individual));
  if (material_id) searchParams.set("material_id", String(material_id));

  return useQuery({
    queryKey: recolectoresKeys.list({
      page,
      limit,
      sortOrder,
      search,
      activo,
      zona_id,
      asociacion_id,
      genero,
      trabaja_individual,
      material_id,
    }),
    queryFn: () =>
      clientGet<PaginatedResponse<Recolector>>(
        `/recolectores?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}

// Shape devuelto por GET /recolectores/mapa.
// Verificado contra `recolectores.service.ts#findAllForMap`.
type RecolectorMapa = {
  id: number;
  nombre_completo: string;
  direccion_domicilio: string;
  latitud: number | null;
  longitud: number | null;
  activo: boolean;
  zona: { nombre: string };
  departamento: { nombre: string };
};

export function useRecolectoresMapa() {
  return useQuery({
    queryKey: recolectoresKeys.mapa(),
    queryFn: () => clientGet<RecolectorMapa[]>("/recolectores/mapa"),
  });
}

// Detalle de una recolectora por id. Alimenta el drawer de perfil abierto
// desde la página de Estadísticas. Patrón "detalle por id": la query solo
// dispara cuando hay un id real (enabled).
export function useRecolectorDetalle(id: number | null) {
  return useQuery({
    queryKey: recolectoresKeys.detail(id ?? 0),
    queryFn: () => clientGet<Recolector>(`/recolectores/${id}`),
    enabled: !!id,
  });
}

type RecolectorMaterialInput = {
  // Catálogo (material_id) o "Otro" (nombre_personalizado + unidad_medida).
  material_id?: number;
  nombre_personalizado?: string;
  unidad_medida?: UnidadMedida;
  cantidad_mensual?: number;
  precio_venta?: number;
  es_principal?: boolean;
};

export function useCreateRecolector() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      email?: string;
      password: string;
      nombre_completo: string;
      cedula_identidad: string;
      celular: string;
      direccion_domicilio: string;
      latitud: number;
      longitud: number;
      zona_id: number;
      genero: Genero;
      edad: number;
      asociacion_id?: number;
      trabaja_individual?: boolean;
      foto_base64?: string;
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
        zona_id?: number;
        genero?: Genero;
        edad?: number;
        asociacion_id?: number;
        trabaja_individual?: boolean;
        foto_base64?: string;
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
