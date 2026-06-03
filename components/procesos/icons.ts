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

const ICON_MAP: Record<string, LucideIcon> = {
  compass: Compass,
  "shield-check": ShieldCheck,
  "trending-up": TrendingUp,
  megaphone: Megaphone,
  sprout: Sprout,
  factory: Factory,
  truck: Truck,
  "truck-fast": Truck,
  handshake: Handshake,
  "flask-conical": FlaskConical,
  users: Users,
  "shopping-cart": ShoppingCart,
  wrench: Wrench,
  server: Server,
  calculator: Calculator,
};

export function getProcessIcon(iconName: string | null | undefined): LucideIcon {
  if (!iconName) return Box;
  return ICON_MAP[iconName] ?? Box;
}
