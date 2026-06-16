import {
  Users,
  Truck,
  MapPin,
  Recycle,
  Tags,
  LayoutGrid,
  ArrowRightLeft,
  Building2,
  type LucideIcon,
} from "lucide-react";

/**
 * Catálogo de reportes para la pestaña "Reportes". Cada reporte es una tarjeta
 * consistente (ícono + título + descripción) agrupada por categoría — patrón
 * validado en docs/28 (tarjetas consistentes, "information scent", flujo
 * elegir → detalle).
 */
export type ReporteCategoria = "Social" | "Operación y volumen";

export type ReporteMeta = {
  id: string;
  title: string;
  descripcion: string;
  href: string;
  icon: LucideIcon;
  categoria: ReporteCategoria;
};

export const reportes: ReporteMeta[] = [
  // --- Social ---
  {
    id: "por-asociacion",
    title: "Por asociación",
    descripcion: "Recolección, ingresos y CO₂ por iniciativa o asociación.",
    href: "/reportes/por-asociacion",
    icon: Users,
    categoria: "Social",
  },
  {
    id: "recolectoras",
    title: "Recolectoras",
    descripcion:
      "Reporte dinámico: filtra por edad, género, material recolectado y más.",
    href: "/reportes/recolectoras",
    icon: Truck,
    categoria: "Social",
  },
  // --- Operación y volumen ---
  {
    id: "por-zona",
    title: "Por zona",
    descripcion: "Volumen recolectado por zona y ciudad.",
    href: "/reportes/por-zona",
    icon: MapPin,
    categoria: "Operación y volumen",
  },
  {
    id: "por-material",
    title: "Por material",
    descripcion: "Cuánto se recicla de cada material y su porcentaje del total.",
    href: "/reportes/por-material",
    icon: Recycle,
    categoria: "Operación y volumen",
  },
  {
    id: "por-tipo-generador",
    title: "Por tipo de generador",
    descripcion: "Qué cantidad viene de bancos, ferias, colegios, etc.",
    href: "/reportes/por-tipo-generador",
    icon: Tags,
    categoria: "Operación y volumen",
  },
  {
    id: "por-material-tipo-generador",
    title: "Material × tipo de generador",
    descripcion: "Qué residuo proviene de qué tipo de fuente generadora.",
    href: "/reportes/por-material-tipo-generador",
    icon: LayoutGrid,
    categoria: "Operación y volumen",
  },
  {
    id: "por-destino",
    title: "Por destino",
    descripcion: "A dónde va: centro operacional, comprador externo o desconocido.",
    href: "/reportes/por-destino",
    icon: ArrowRightLeft,
    categoria: "Operación y volumen",
  },
  {
    id: "por-generador",
    title: "Por generador",
    descripcion: "Cuánto aporta cada empresa generadora a través de sus sucursales.",
    href: "/reportes/por-generador",
    icon: Building2,
    categoria: "Operación y volumen",
  },
];

export const reporteCategorias: ReporteCategoria[] = [
  "Social",
  "Operación y volumen",
];
