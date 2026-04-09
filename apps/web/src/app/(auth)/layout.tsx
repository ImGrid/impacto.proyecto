import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#ECECE2]">
      {/* Lado izquierdo — Ilustración (oculto en móvil) */}
      <div className="hidden flex-1 flex-col items-center justify-center p-10 lg:flex">
        <Image
          src="/images/SENORA-2.png"
          alt="Recolectora saludando"
          width={380}
          height={480}
          className="max-h-[380px] w-auto drop-shadow-lg"
          priority
        />
        <p className="mt-8 text-lg font-bold text-foreground">
          Sistema Triple Impacto
        </p>
      </div>

      {/* Lado derecho — Formulario */}
      <div className="flex w-full flex-col justify-center bg-background p-12 shadow-[-4px_0_24px_rgba(0,0,0,0.06)] lg:w-[480px] lg:shrink-0">
        {children}
      </div>
    </div>
  );
}
