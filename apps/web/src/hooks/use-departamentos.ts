"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { clientGet } from "@/lib/client-api";
import type { Departamento, PaginatedResponse } from "@/types/api";

export const departamentosKeys = {
  all: ["departamentos"] as const,
  lists: () => [...departamentosKeys.all, "list"] as const,
  list: (params: Record<string, unknown>) =>
    [...departamentosKeys.lists(), params] as const,
};

type UseDepartamentosParams = {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
  search?: string;
  activo?: boolean;
};

export function useDepartamentos(params: UseDepartamentosParams = {}) {
  const { page = 1, limit = 50, sortOrder = "asc", search, activo } = params;

  const searchParams = new URLSearchParams();
  searchParams.set("page", String(page));
  searchParams.set("limit", String(limit));
  searchParams.set("sortOrder", sortOrder);
  if (search) searchParams.set("search", search);
  if (activo !== undefined) searchParams.set("activo", String(activo));

  return useQuery({
    queryKey: departamentosKeys.list({ page, limit, sortOrder, search, activo }),
    queryFn: () =>
      clientGet<PaginatedResponse<Departamento>>(
        `/departamentos?${searchParams.toString()}`,
      ),
    placeholderData: keepPreviousData,
  });
}
