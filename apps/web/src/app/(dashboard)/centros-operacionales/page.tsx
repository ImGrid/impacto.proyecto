import { CentrosOperacionalesContent } from "./_components/centros-operacionales-content";

export default function CentrosOperacionalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Centros operacionales
        </h1>
        <p className="text-muted-foreground">
          Gestión de centros operacionales fijos y móviles.
        </p>
      </div>
      <CentrosOperacionalesContent />
    </div>
  );
}
