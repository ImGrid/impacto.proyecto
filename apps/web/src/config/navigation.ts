import {
  LayoutDashboard,
  ShieldCheck,
  Truck,
  Store,
  Building2,
  MapPinned,
  MapPin,
  Recycle,
  Tags,
  Users,
  BadgeDollarSign,
  Megaphone,
  Bell,
  UsersRound,
  BookOpen,
  ClipboardList,
  ArrowLeftRight,
  Banknote,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export type NavSection = {
  title: string;
  icon: LucideIcon;
  items: NavItem[];
};

export const sidebarNavigation: NavSection[] = [
  {
    title: "Gestión de Usuarios",
    icon: UsersRound,
    items: [
      { title: "Administradores", href: "/administradores", icon: ShieldCheck },
      { title: "Recolectores", href: "/recolectores", icon: Truck },
      { title: "Acopiadores", href: "/acopiadores", icon: Store },
      { title: "Generadores", href: "/generadores", icon: Building2 },
      { title: "Sucursales", href: "/sucursales", icon: MapPinned },
    ],
  },
  {
    title: "Catálogos",
    icon: BookOpen,
    items: [
      { title: "Zonas", href: "/zonas", icon: MapPin },
      { title: "Materiales", href: "/materiales", icon: Recycle },
      { title: "Tipos de Generador", href: "/tipos-generador", icon: Tags },
      { title: "Asociaciones", href: "/asociaciones", icon: Users },
      { title: "Precios Materiales", href: "/precios-material", icon: BadgeDollarSign },
    ],
  },
  {
    title: "Operaciones",
    icon: ClipboardList,
    items: [
      { title: "Transacciones", href: "/transacciones", icon: ArrowLeftRight },
      { title: "Pagos", href: "/pagos", icon: Banknote },
    ],
  },
  {
    title: "Comunicación",
    icon: Megaphone,
    items: [
      { title: "Eventos", href: "/eventos", icon: Megaphone },
      { title: "Notificaciones", href: "/notificaciones", icon: Bell },
    ],
  },
];

export const dashboardItem: NavItem = {
  title: "Dashboard",
  href: "/",
  icon: LayoutDashboard,
};
