import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeJwt } from "jose";

export type SessionUser = {
  userId: number;
  identificador: string;
  rol: string;
  // Departamento activo de la sesión del admin. Lo emite el backend en el
  // JWT (campo `departamento_activo` del payload). Es `null` solo para
  // generador, que no aplica al panel web; para admin siempre debe haber
  // uno seleccionado al hacer login.
  departamento_activo: number | null;
};

// Se ejecuta una sola vez por request gracias a cache()
export const verifySession = cache(async (): Promise<SessionUser> => {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("access_token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  try {
    // Decodificar el JWT para extraer datos del usuario
    // No verificamos la firma porque:
    // 1. El token está en una cookie httpOnly que JS no puede modificar
    // 2. Fue seteado por nuestro propio Server Action
    // 3. NestJS verifica la firma cuando hacemos requests a la API
    const payload = decodeJwt(accessToken);

    // Defensa en profundidad: solo ADMIN puede usar el panel web
    if (payload.rol !== "ADMIN") {
      redirect("/login");
    }

    // El campo `departamento_activo` puede venir como number o null en el
    // JWT. Cualquier otra cosa la tratamos como null (defensivo).
    const deptoRaw = payload.departamento_activo;
    const departamentoActivo =
      typeof deptoRaw === "number" ? deptoRaw : null;

    return {
      userId: Number(payload.sub),
      identificador: String(payload.identificador),
      rol: String(payload.rol),
      departamento_activo: departamentoActivo,
    };
  } catch {
    // JWT malformado o corrupto
    redirect("/login");
  }
});
