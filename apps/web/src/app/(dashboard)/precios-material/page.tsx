import { PreciosMaterialContent } from "./_components/precios-material-content";

export default function PreciosMaterialPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Precios Materiales
        </h1>
        <p className="text-muted-foreground">
          Gestión de precios referenciales por material con vigencia temporal.
        </p>
      </div>
      <PreciosMaterialContent />
    </div>
  );
}
