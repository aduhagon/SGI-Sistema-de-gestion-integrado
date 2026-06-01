import {
  Compass,
  ShieldCheck,
  TrendingUp,
  Megaphone,
  Sprout,
  Factory,
  Truck,
  Handshake,
  FlaskConical,
  Users,
  ShoppingCart,
  Wrench,
  Server,
  Calculator,
  Box,
  type LucideIcon,
} from "lucide-react";

/**
 * Mapeo entre los nombres de iconos almacenados en la columna procesos.icono
 * y los componentes de lucide-react.
 *
 * Centralizado en un solo lugar para evitar importar dinámicamente todo el
 * paquete de iconos (lo cual aumentaría el bundle innecesariamente).
 *
 * Si se agregan procesos con iconos nuevos, agregarlos acá.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  compass: Compass,
  "shield-check": ShieldCheck,
  "trending-up": TrendingUp,
  megaphone: Megaphone,
  sprout: Sprout,
  factory: Factory,
  truck: Truck,
  "truck-fast": Truck, // alias visual aceptado
  handshake: Handshake,
  "flask-conical": FlaskConical,
  users: Users,
  "shopping-cart": ShoppingCart,
  wrench: Wrench,
  server: Server,
  calculator: Calculator,
};

/**
 * Devuelve el componente de icono correspondiente al nombre dado.
 * Si el nombre no se encuentra en el mapeo, devuelve un icono por defecto.
 */
export function getProcessIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Box;
  return ICON_MAP[iconName] ?? Box;
}
