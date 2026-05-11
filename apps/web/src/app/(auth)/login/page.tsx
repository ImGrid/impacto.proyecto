import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./_components/login-form";
import type { Departamento } from "@/types/api";

const API_URL = process.env.API_URL!;

// Cargamos los departamentos en el servidor antes de renderizar el formulario.
// El endpoint GET /departamentos está marcado @Public() en el backend, así
// que no requiere autenticación. Si la API está caída se devuelve [] y el
// formulario muestra un aviso al usuario.
async function fetchDepartamentos(): Promise<Departamento[]> {
  try {
    const res = await fetch(
      `${API_URL}/departamentos?activo=true&limit=100&sortOrder=asc`,
      { cache: "no-store" },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch {
    return [];
  }
}

export default async function LoginPage() {
  const departamentos = await fetchDepartamentos();

  return (
    <>
      <div className="mb-10 text-center">
        <Image
          src="/images/logo-triple-impacto-a-color.png"
          alt="Triple Impacto"
          width={200}
          height={64}
          className="mx-auto h-16 w-auto"
          priority
        />
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold">Iniciar Sesión</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Ingrese sus credenciales para acceder al panel
        </p>
      </div>

      <Suspense>
        <LoginForm departamentos={departamentos} />
      </Suspense>
    </>
  );
}
