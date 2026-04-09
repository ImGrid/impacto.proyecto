type RequestOptions = {
  method?: string;
  body?: unknown;
};

async function clientRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body } = options;

  const res = await fetch(`/api${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  // 204 No Content (DELETE)
  if (res.status === 204) {
    return undefined as T;
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = data?.message || "Error al comunicarse con el servidor";
    throw new Error(Array.isArray(message) ? message[0] : message);
  }

  return data as T;
}

export function clientGet<T = unknown>(endpoint: string) {
  return clientRequest<T>(endpoint);
}

export function clientPost<T = unknown>(endpoint: string, body: unknown) {
  return clientRequest<T>(endpoint, { method: "POST", body });
}

export function clientPatch<T = unknown>(endpoint: string, body: unknown) {
  return clientRequest<T>(endpoint, { method: "PATCH", body });
}

export function clientDelete(endpoint: string) {
  return clientRequest(endpoint, { method: "DELETE" });
}
