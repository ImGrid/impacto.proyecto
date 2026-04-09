import { MaterialesContent } from "./_components/materiales-content";

export default function MaterialesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Materiales</h1>
        <p className="text-muted-foreground">
          Gestión de tipos de residuos reciclables.
        </p>
      </div>
      <MaterialesContent />
    </div>
  );
}
