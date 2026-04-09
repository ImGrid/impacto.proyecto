import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.API_URL!;

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

// Wrapper principal para hacer requests al NestJS API
// El refresh de tokens lo maneja el middleware de forma proactiva.
// Si llegamos aquí con un 401, significa que el refresh también falló.
export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  const { method = "GET", body, headers = {} } = options;

  const fetchOptions: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`${API_URL}${endpoint}`, fetchOptions);

  // Si 401, redirigir a login (el middleware debería haber refrescado antes)
  if (response.status === 401) {
    redirect("/login");
  }

  // Para DELETE que devuelve 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  // Si hay error, lanzar con el mensaje del backend
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const message =
      errorData?.message || "Error al comunicarse con el servidor";
    throw new Error(Array.isArray(message) ? message[0] : message);
  }

  return response.json();
}

// Helpers de conveniencia
export function apiGet<T = unknown>(endpoint: string) {
  return apiRequest<T>(endpoint);
}

export function apiPost<T = unknown>(endpoint: string, body: unknown) {
  return apiRequest<T>(endpoint, { method: "POST", body });
}

export function apiPatch<T = unknown>(endpoint: string, body: unknown) {
  return apiRequest<T>(endpoint, { method: "PATCH", body });
}

export function apiDelete(endpoint: string) {
  return apiRequest(endpoint, { method: "DELETE" });
}
