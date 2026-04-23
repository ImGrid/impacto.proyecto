"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeJwt } from "jose";

const API_URL = process.env.API_URL!;

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

// El access_token del backend expira a los 15 min. La cookie la hacemos
// durar 13 min (2 min menos) para que el navegador la "borre" antes de
// que el JWT realmente caduque: así la siguiente llamada al proxy llega
// sin access cookie y el proxy dispara un refresh limpio, en lugar de
// mandar un JWT vencido y caer en race con el refresh.
// Referencia: https://dev.to/silentwatcher_95/race-conditions-in-jwt-refresh-token-rotation-3j5k
const ACCESS_COOKIE_MAX_AGE = 13 * 60;
const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export type LoginState = {
  error?: string;
} | null;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const identificador = formData.get("identificador") as string;
  const password = formData.get("password") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    // Llamar al backend NestJS
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identificador, password }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const message = errorData?.message || "Error de autenticación";
      return { error: Array.isArray(message) ? message[0] : message };
    }

    const data = await response.json();

    // Verificar que el usuario sea ADMIN — solo administradores acceden al panel web
    try {
      const payload = decodeJwt(data.access_token);
      if (payload.rol !== "ADMIN") {
        return { error: "Acceso denegado. Este panel es solo para administradores." };
      }
    } catch {
      return { error: "Error al verificar credenciales." };
    }

    // Guardar tokens en cookies httpOnly
    const cookieStore = await cookies();

    cookieStore.set("access_token", data.access_token, {
      ...cookieOptions,
      maxAge: ACCESS_COOKIE_MAX_AGE,
    });

    cookieStore.set("refresh_token", data.refresh_token, {
      ...cookieOptions,
      maxAge: REFRESH_COOKIE_MAX_AGE,
    });

  } catch {
    return { error: "No se pudo conectar con el servidor. Intente más tarde." };
  }

  // redirect() lanza una excepción internamente, debe ir fuera del try/catch
  redirect(callbackUrl);
}

export async function logout() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  // Invalidar sesión en el backend (best-effort)
  if (accessToken && refreshToken) {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      // Si falla, igual limpiamos las cookies
    }
  }

  // Siempre borrar cookies locales
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");

  redirect("/login");
}
