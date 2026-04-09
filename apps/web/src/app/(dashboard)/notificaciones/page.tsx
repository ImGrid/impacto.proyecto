import { NotificacionesContent } from "./_components/notificaciones-content";

export default function NotificacionesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
        <p className="text-muted-foreground">
          Envío de mensajes directos a recolectoras e historial de
          notificaciones enviadas.
        </p>
      </div>
      <NotificacionesContent />
    </div>
  );
}
