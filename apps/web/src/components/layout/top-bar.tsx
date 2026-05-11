"use client";

import { Fragment, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Loader2 } from "lucide-react";
import { useDepartamentos } from "@/hooks/use-departamentos";
import { switchDepartamento } from "@/app/actions/auth";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mapeo de segmentos de URL a nombres legibles en español
const segmentLabels: Record<string, string> = {
  administradores: "Administradores",
  recolectores: "Recolectores",
  "centros-operacionales": "Centros operacionales",
  generadores: "Generadores",
  sucursales: "Sucursales",
  ciudades: "Ciudades",
  zonas: "Zonas",
  materiales: "Materiales",
  "tipos-generador": "Tipos de Generador",
  asociaciones: "Asociaciones",
  externos: "Acopiadores externos",
  transacciones: "Transacciones",
  pagos: "Pagos",
  "precios-material": "Precios Materiales",
  eventos: "Eventos",
  notificaciones: "Notificaciones",
  crear: "Crear",
};

function getLabel(segment: string): string {
  return segmentLabels[segment] || segment;
}

interface TopBarProps {
  departamentoActivo: number | null;
}

export function TopBar({ departamentoActivo }: TopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, startTransition] = useTransition();

  // Lista de departamentos disponibles para el switcher. Pasa por el proxy
  // BFF, que añade el access_token automáticamente.
  const { data: departamentosData } = useDepartamentos({
    activo: true,
    limit: 100,
  });
  const departamentos = departamentosData?.data ?? [];

  // Generar breadcrumbs a partir de la ruta actual
  const segments = pathname.split("/").filter(Boolean);

  function handleDepartamentoChange(value: string) {
    const nuevo = Number(value);
    if (!Number.isFinite(nuevo) || nuevo === departamentoActivo) return;

    startTransition(async () => {
      const result = await switchDepartamento(nuevo);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      // Cambió el departamento activo del JWT: toda la cache de TanStack
      // queda inválida porque el backend filtra por depto. Limpiamos todo
      // y refrescamos los Server Components para que vuelvan a leer el JWT.
      queryClient.clear();
      router.refresh();
      const nombre = departamentos.find((d) => d.id === nuevo)?.nombre;
      toast.success(
        nombre
          ? `Departamento activo: ${nombre}`
          : "Departamento cambiado correctamente",
      );
    });
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {segments.length === 0 ? (
              <BreadcrumbPage>Dashboard</BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href="/">Dashboard</Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>

          {segments.map((segment, index) => {
            const href = "/" + segments.slice(0, index + 1).join("/");
            const isLast = index === segments.length - 1;

            // Si el segmento es un ID numérico, mostrar "Detalle"
            const label = /^\d+$/.test(segment)
              ? "Detalle"
              : getLabel(segment);

            return (
              <Fragment key={href}>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={href}>{label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Switcher de departamento activo. Aparece a la derecha del topbar. */}
      <div className="ml-auto flex items-center gap-2">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Building2 className="h-4 w-4 text-muted-foreground" />
        )}
        <Select
          value={departamentoActivo ? String(departamentoActivo) : ""}
          onValueChange={handleDepartamentoChange}
          disabled={isPending || departamentos.length === 0}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Departamento" />
          </SelectTrigger>
          <SelectContent>
            {departamentos.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
