import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL!;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

async function tryRefresh(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function proxyRequest(req: NextRequest) {
  const cookieStore = await cookies();
  let accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // Construir la URL destino: /api/zonas?page=1 → API_URL/zonas?page=1
  const { pathname, search } = req.nextUrl;
  const backendPath = pathname.replace(/^\/api/, "");
  const url = `${API_URL}${backendPath}${search}`;

  // Construir headers para el backend
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  // Leer body para POST/PATCH
  let body: string | undefined;
  if (req.method === "POST" || req.method === "PATCH") {
    body = await req.text();
  }

  let response = await fetch(url, {
    method: req.method,
    headers,
    ...(body ? { body } : {}),
  });

  // Si 401, intentar refresh y reintentar
  if (response.status === 401 && refreshToken) {
    const tokens = await tryRefresh(refreshToken);

    if (tokens) {
      // Actualizar cookies con nuevos tokens
      cookieStore.set("access_token", tokens.access_token, {
        ...cookieOptions,
        maxAge: 15 * 60,
      });
      cookieStore.set("refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60,
      });

      headers["Authorization"] = `Bearer ${tokens.access_token}`;
      response = await fetch(url, {
        method: req.method,
        headers,
        ...(body ? { body } : {}),
      });
    }
  }

  // Si sigue 401 después del refresh
  if (response.status === 401) {
    return NextResponse.json(
      { message: "No autorizado" },
      { status: 401 },
    );
  }

  // 204 No Content
  if (response.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  // Devolver la respuesta del backend tal cual
  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
