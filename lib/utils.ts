import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind de manera inteligente, resolviendo conflictos.
 *
 * Ejemplo:
 *   cn("text-red-500", "text-blue-500") => "text-blue-500"
 *   cn("px-4 py-2", isActive && "bg-primary") => clases condicionales
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
