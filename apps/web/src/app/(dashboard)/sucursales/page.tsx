import { SucursalesContent } from "./_components/sucursales-content";

export default function SucursalesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Sucursales</h1>
        <p className="text-muted-foreground">
          Gestión de puntos de recogida de las empresas generadoras.
        </p>
      </div>
      <SucursalesContent />
    </div>
  );
}
