import { EventosContent } from "./_components/eventos-content";

export default function EventosPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
        <p className="text-muted-foreground">
          Gestión de eventos de recolección. Al crear un evento se notifica
          automáticamente a las recolectoras de la zona.
        </p>
      </div>
      <EventosContent />
    </div>
  );
}
