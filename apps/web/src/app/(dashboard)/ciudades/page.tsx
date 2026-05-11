import { CiudadesContent } from "./_components/ciudades-content";

export default function CiudadesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ciudades</h1>
        <p className="text-muted-foreground">
          Gestión de ciudades agrupadas por departamento. Cada zona
          geográfica pertenece a una ciudad.
        </p>
      </div>
      <CiudadesContent />
    </div>
  );
}
