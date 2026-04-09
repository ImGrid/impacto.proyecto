"use client";

import { Fragment } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
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

// Mapeo de segmentos de URL a nombres legibles en español
const segmentLabels: Record<string, string> = {
  administradores: "Administradores",
  recolectores: "Recolectores",
  acopiadores: "Acopiadores",
  generadores: "Generadores",
  sucursales: "Sucursales",
  zonas: "Zonas",
  materiales: "Materiales",
  "tipos-generador": "Tipos de Generador",
  asociaciones: "Asociaciones",
  crear: "Crear",
};

function getLabel(segment: string): string {
  return segmentLabels[segment] || segment;
}

export function TopBar() {
  const pathname = usePathname();

  // Generar breadcrumbs a partir de la ruta actual
  const segments = pathname.split("/").filter(Boolean);

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
    </header>
  );
}
