import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { DepartamentoProvider } from "@/components/departamento-context";
import { verifySession } from "@/lib/dal";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verificar sesión: redirige a /login si no hay token válido
  const session = await verifySession();

  return (
    <DepartamentoProvider value={session.departamento_activo}>
      <SidebarProvider>
        <AppSidebar userIdentificador={session.identificador} />
        <SidebarInset>
          <TopBar
          departamentoActivo={session.departamento_activo}
          departamentoFijo={session.departamento_fijo}
        />
          <div className="flex-1 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DepartamentoProvider>
  );
}
