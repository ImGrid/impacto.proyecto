import { TransaccionesContent } from "./_components/transacciones-content";

export default function TransaccionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Transacciones</h1>
        <p className="text-muted-foreground">
          Historial de entregas de materiales reciclables con el recorrido
          completo de cada transacción.
        </p>
      </div>
      <TransaccionesContent />
    </div>
  );
}
