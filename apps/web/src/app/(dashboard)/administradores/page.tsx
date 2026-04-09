import { AdministradoresContent } from "./_components/administradores-content";

export default function AdministradoresPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Administradores</h1>
        <p className="text-muted-foreground">
          Gestión de usuarios administradores del sistema.
        </p>
      </div>
      <AdministradoresContent />
    </div>
  );
}
