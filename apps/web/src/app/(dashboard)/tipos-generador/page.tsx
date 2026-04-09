import { TiposGeneradorContent } from "./_components/tipos-generador-content";

export default function TiposGeneradorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Tipos de Generador
        </h1>
        <p className="text-muted-foreground">
          Gestión de tipos de empresas generadoras de residuos.
        </p>
      </div>
      <TiposGeneradorContent />
    </div>
  );
}
