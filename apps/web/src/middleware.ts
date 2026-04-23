import { NextRequest, NextResponse } from "next/server";
import { decodeJwt } from "jose";

const publicPaths = ["/login"];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname.startsWith(path));
}

/**
 * Middleware liviano: solo valida presencia de cookies y rol.
 *
 * El refresh del token se delega por completo al proxy
 * `app/api/[...path]/route.ts`. Mezclar refresh aquí y en el proxy
 * provocaba race conditions: ambos caminos intentaban rotar el refresh
 * token al mismo tiempo y — como el refresh es single-use — el segundo
 * fallaba y expulsaba al usuario. Centralizar en un solo lugar elimina
 * esa carrera.
 *
 * Referencia: https://github.com/vercel/next.js/discussions/78604
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // Sin ninguna cookie en ruta protegida → login.
  // Si hay refresh pero la cookie de access expiró (por su maxAge), el
  // proxy refrescará en la primera llamada del cliente. Aquí solo
  // dejamos pasar para que se cargue la página.
  if (!accessToken && !refreshToken && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Solo administradores acceden al panel web.
  if (accessToken && !isPublicPath(pathname)) {
    try {
      const payload = decodeJwt(accessToken);
      if (payload.rol !== "ADMIN") {
        const loginUrl = new URL("/login", request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete("access_token");
        response.cookies.delete("refresh_token");
        return response;
      }
    } catch {
      // Token corrupto: lo ignoramos y dejamos que el proxy maneje el
      // refresh en la primera llamada.
    }
  }

  // Con sesión activa visitando /login → dashboard.
  if (accessToken && pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|images|leaflet|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
