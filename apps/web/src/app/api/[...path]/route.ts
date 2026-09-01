import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL!;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// Mismo skew que en actions/auth.ts: la cookie del access dura 2 min
// menos que el JWT (15 min backend → 13 min cookie) para evitar que
// el navegador mande un JWT vencido justo en el límite.
const ACCESS_COOKIE_MAX_AGE = 13 * 60;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

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

  // La APP MÓVIL entra por este mismo dominio (nginx manda todo /api/* aquí,
  // no al backend), pero no usa cookies: guarda el JWT en el almacenamiento
  // seguro del teléfono y lo manda en la cabecera `Authorization`.
  //
  // Sin este respaldo el proxy descartaba esa cabecera y no enviaba ninguna
  // credencial al backend, así que la app conseguía iniciar sesión (esa ruta
  // es pública) y despues recibía 401 en absolutamente todo lo demás.
  //
  // La cookie tiene prioridad a propósito: en el navegador el token vive en
  // una cookie httpOnly justamente para que el JavaScript de la página no
  // pueda leerlo, y esa protección no debe poder saltarse mandando una
  // cabecera. Este respaldo solo actúa cuando NO hay sesión de navegador.
  if (!accessToken) {
    const cabecera = req.headers.get("authorization");
    if (cabecera?.startsWith("Bearer ")) {
      accessToken = cabecera.slice("Bearer ".length).trim() || undefined;
    }
  }

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
        maxAge: ACCESS_COOKIE_MAX_AGE,
      });
      cookieStore.set("refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: REFRESH_COOKIE_MAX_AGE,
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

  // Descargas binarias (Excel/PDF): el backend responde con un Content-Type
  // que NO es JSON. Se transmite el archivo tal cual, conservando los headers
  // de tipo y de descarga (el proxy no puede hacer res.json() de un binario).
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    const buffer = await response.arrayBuffer();
    const headers = new Headers();
    headers.set("content-type", contentType);
    const disposition = response.headers.get("content-disposition");
    if (disposition) headers.set("content-disposition", disposition);
    return new NextResponse(buffer, { status: response.status, headers });
  }

  // Respuesta JSON normal
  const data = await response.json().catch(() => null);
  return NextResponse.json(data, { status: response.status });
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
