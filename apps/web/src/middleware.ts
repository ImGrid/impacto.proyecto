import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

const publicPaths = ["/login"];

// Refrescar si faltan menos de 60 segundos para expirar
const REFRESH_BUFFER_SECONDS = 60;

const API_URL = process.env.API_URL!;

const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/",
};

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
}

function isTokenExpiringSoon(token: string): boolean {
  try {
    const payload = decodeJwt(token);
    if (!payload.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now < REFRESH_BUFFER_SECONDS;
  } catch {
    return true;
  }
}

async function refreshTokens(
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // Sin cookies en ruta protegida → login
  if (!accessToken && !isPublicPath(pathname)) {
    // Intentar refresh si hay refresh_token
    if (refreshToken) {
      const tokens = await refreshTokens(refreshToken);
      if (tokens) {
        // Refresh exitoso → setear cookies y continuar
        const response = NextResponse.next();
        response.cookies.set("access_token", tokens.access_token, {
          ...cookieOptions,
          maxAge: 15 * 60,
        });
        response.cookies.set("refresh_token", tokens.refresh_token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60,
        });

        // Actualizar cookies del request para que Server Components las lean
        request.cookies.set("access_token", tokens.access_token);
        request.cookies.set("refresh_token", tokens.refresh_token);
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set("cookie", request.cookies.toString());

        return NextResponse.next({ request: { headers: requestHeaders } });
      }
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Con cookie en /login → dashboard
  if (accessToken && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Token existe y no está por expirar → pasar sin hacer nada
  if (accessToken && !isTokenExpiringSoon(accessToken)) {
    return NextResponse.next();
  }

  // Token está por expirar o expirado → intentar refresh
  if (accessToken && refreshToken && isTokenExpiringSoon(accessToken)) {
    const tokens = await refreshTokens(refreshToken);

    if (tokens) {
      // Refresh exitoso → actualizar cookies en response y request
      const response = NextResponse.next();
      response.cookies.set("access_token", tokens.access_token, {
        ...cookieOptions,
        maxAge: 15 * 60,
      });
      response.cookies.set("refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60,
      });

      // Actualizar cookies del request para Server Components
      request.cookies.set("access_token", tokens.access_token);
      request.cookies.set("refresh_token", tokens.refresh_token);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("cookie", request.cookies.toString());

      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Refresh falló → limpiar cookies y redirigir a login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("access_token");
    response.cookies.delete("refresh_token");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|images|leaflet|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
