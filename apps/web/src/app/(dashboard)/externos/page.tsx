import { ExternosContent } from "./_components/externos-content";

export default function ExternosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Acopiadores externos
        </h1>
        <p className="text-muted-foreground">
          Catálogo de acopiadores y compradores externos al sistema. Se usan
          como destino opcional en una transacción, pero no son usuarios y
          no generan pagos en el sistema.
        </p>
      </div>
      <ExternosContent />
    </div>
  );
}
