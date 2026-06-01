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
