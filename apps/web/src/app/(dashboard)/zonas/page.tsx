import { ZonasContent } from "./_components/zonas-content";

export default function ZonasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Zonas</h1>
        <p className="text-muted-foreground">
          Gestión de zonas geográficas del sistema.
        </p>
      </div>
      <ZonasContent />
    </div>
  );
}
