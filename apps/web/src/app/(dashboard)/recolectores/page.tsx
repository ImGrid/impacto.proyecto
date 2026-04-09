import { RecolectoresContent } from "./_components/recolectores-content";

export default function RecolectoresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recolectores</h1>
        <p className="text-muted-foreground">
          Gestión de recolectores de residuos reciclables.
        </p>
      </div>
      <RecolectoresContent />
    </div>
  );
}
