import { AsociacionesContent } from "./_components/asociaciones-content";

export default function AsociacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Asociaciones</h1>
        <p className="text-muted-foreground">
          Gestión de asociaciones de recolectores.
        </p>
      </div>
      <AsociacionesContent />
    </div>
  );
}
