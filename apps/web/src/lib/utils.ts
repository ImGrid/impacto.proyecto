import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normaliza un texto para COMPARAR (no para guardar): minúsculas, sin tildes
 * y con espacios colapsados. Detecta nombres "Otro" duplicados ignorando
 * mayúsculas, acentos y espacios. "Pílas"/"pilas"/" Pilas " → "pilas".
 * ("Pila" ≠ "Pilas": deliberadamente no es difuso.)
 */
export function normalizarParaComparar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
}

/**
 * Construye la URL absoluta de una imagen subida a partir de su ruta pública
 * relativa (`/uploads/...`). En desarrollo la API sirve los archivos en otro
 * puerto, así que se antepone NEXT_PUBLIC_UPLOADS_BASE_URL; en producción nginx
 * sirve /uploads en el mismo origen, por lo que la variable queda vacía y la
 * ruta relativa funciona tal cual. Devuelve null si no hay foto.
 */
export function fotoSrc(fotoUrl: string | null | undefined): string | null {
  if (!fotoUrl) return null;
  const base = process.env.NEXT_PUBLIC_UPLOADS_BASE_URL ?? "";
  return `${base}${fotoUrl}`;
}
