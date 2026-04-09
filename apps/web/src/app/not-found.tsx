import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-10 text-center">
      <Image
        src="/images/SENORA-3.png"
        alt="Página no encontrada"
        width={220}
        height={280}
        className="mb-6 h-[220px] w-auto drop-shadow-lg"
      />
      <p className="text-7xl font-extrabold text-border">404</p>
      <h1 className="mt-2 text-2xl font-bold">Página no encontrada</h1>
      <p className="mt-2 max-w-[400px] text-sm text-muted-foreground">
        La página que estás buscando no existe o fue movida. Verifica la URL o
        regresa al inicio.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild>
          <Link href="/">Ir al Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
