import { AcopiadoresContent } from "./_components/acopiadores-content";

export default function AcopiadoresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Acopiadores</h1>
        <p className="text-muted-foreground">
          Gestión de centros de acopio y acopiadores móviles.
        </p>
      </div>
      <AcopiadoresContent />
    </div>
  );
}
