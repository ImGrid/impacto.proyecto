import {
  LayoutDashboard,
  Truck,
  Store,
  Building2,
  MapPinned,
  MapPin,
  Landmark,
  Handshake,
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
  BarChart3,
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
      { title: "Recolectores", href: "/recolectores", icon: Truck },
      { title: "Centros operacionales", href: "/centros-operacionales", icon: Store },
      { title: "Generadores", href: "/generadores", icon: Building2 },
      { title: "Sucursales", href: "/sucursales", icon: MapPinned },
    ],
  },
  {
    title: "Catálogos",
    icon: BookOpen,
    items: [
      { title: "Ciudades", href: "/ciudades", icon: Landmark },
      { title: "Zonas", href: "/zonas", icon: MapPin },
      { title: "Materiales", href: "/materiales", icon: Recycle },
      { title: "Tipos de Generador", href: "/tipos-generador", icon: Tags },
      { title: "Asociaciones", href: "/asociaciones", icon: Users },
      { title: "Acopiadores externos", href: "/externos", icon: Handshake },
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

export const estadisticasItem: NavItem = {
  title: "Estadísticas",
  href: "/estadisticas",
  icon: BarChart3,
};
