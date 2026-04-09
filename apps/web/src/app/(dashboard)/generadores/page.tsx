import { GeneradoresContent } from "./_components/generadores-content";

export default function GeneradoresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Generadores</h1>
        <p className="text-muted-foreground">
          Gestión de empresas generadoras de residuos.
        </p>
      </div>
      <GeneradoresContent />
    </div>
  );
}
