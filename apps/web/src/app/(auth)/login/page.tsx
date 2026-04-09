import { Suspense } from "react";
import Image from "next/image";
import { LoginForm } from "./_components/login-form";

export default function LoginPage() {
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
        <LoginForm />
      </Suspense>

    </>
  );
}
