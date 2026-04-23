"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, LogOut } from "lucide-react";
import { sidebarNavigation, dashboardItem, estadisticasItem } from "@/config/navigation";
import { logout } from "@/app/actions/auth";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar({ userIdentificador }: { userIdentificador: string }) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <Image
                  src="/images/Logo-triple-impacto-positivo.png"
                  alt="Triple Impacto"
                  width={32}
                  height={32}
                  className="size-8 shrink-0"
                />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    Triple Impacto
                  </span>
                  <span className="truncate text-xs opacity-70">
                    Administración
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1">
        {/* Dashboard y Estadísticas — items sueltos */}
        <SidebarGroup className="p-1.5 pb-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === "/"}
                  tooltip={dashboardItem.title}
                  className="h-9 text-[0.9rem] [&>svg]:size-[1.15rem]"
                >
                  <Link href={dashboardItem.href}>
                    <dashboardItem.icon />
                    <span>{dashboardItem.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(estadisticasItem.href)}
                  tooltip={estadisticasItem.title}
                  className="h-9 text-[0.9rem] [&>svg]:size-[1.15rem]"
                >
                  <Link href={estadisticasItem.href}>
                    <estadisticasItem.icon />
                    <span>{estadisticasItem.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secciones collapsibles */}
        {sidebarNavigation.map((section) => {
          const sectionActive = section.items.some((item) =>
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href),
          );

          return (
            <SidebarGroup key={section.title} className="p-1.5 pb-0">
              <SidebarGroupContent>
                <SidebarMenu>
                  <Collapsible
                    defaultOpen={sectionActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={section.title}
                          className="h-9 text-[0.9rem] font-medium [&>svg]:size-[1.15rem]"
                        >
                          <section.icon />
                          <span>{section.title}</span>
                          <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {section.items.map((item) => {
                            const isActive =
                              item.href === "/"
                                ? pathname === "/"
                                : pathname.startsWith(item.href);

                            return (
                              <SidebarMenuSubItem key={item.href}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isActive}
                                >
                                  <Link href={item.href}>
                                    <item.icon />
                                    <span>{item.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={userIdentificador} asChild>
              <span className="text-xs text-muted-foreground truncate">
                {userIdentificador}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <form action={logout}>
              <SidebarMenuButton
                type="submit"
                tooltip="Cerrar sesión"
                className="w-full"
              >
                <LogOut />
                <span>Cerrar sesión</span>
              </SidebarMenuButton>
            </form>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
