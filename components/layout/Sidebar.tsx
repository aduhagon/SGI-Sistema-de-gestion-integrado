"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Network,
  FileText,
  CheckSquare,
  PenSquare,
  ClipboardCheck,
  AlertOctagon,
  Grid3x3,
  ShieldAlert,
  Gauge,
  Scale,
  LineChart,
  Settings,
  SlidersHorizontal,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Seccion = "inicio" | "gestion" | "analisis" | "admin";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: Seccion;
  soloSuperadmin?: boolean;
};

const navItems: NavItem[] = [
  // Inicio — el trabajo pendiente del usuario
  { href: "/dashboard",     label: "Dashboard",        icon: LayoutDashboard, section: "inicio" },
  { href: "/aprobaciones",  label: "Aprobaciones",     icon: CheckSquare,     section: "inicio" },
  { href: "/acuses",        label: "Acuses",           icon: PenSquare,       section: "inicio" },

  // Gestión del SGI — registros que se mantienen
  { href: "/documentos",         label: "Documentos",         icon: FileText,       section: "gestion" },
  { href: "/procesos",           label: "Procesos",           icon: Network,        section: "gestion" },
  { href: "/cumplimiento",       label: "Cumplimiento",       icon: Grid3x3,        section: "gestion" },
  { href: "/requisitos-legales", label: "Requisitos legales", icon: Scale,          section: "gestion" },
  { href: "/riesgos",            label: "Riesgos",            icon: ShieldAlert,    section: "gestion" },
  { href: "/auditorias",         label: "Auditorías",         icon: ClipboardCheck, section: "gestion" },
  { href: "/ncs",                label: "No conformidades",   icon: AlertOctagon,   section: "gestion" },

  // Análisis — lectura / reporte
  { href: "/indicadores",   label: "Indicadores",        icon: Gauge,      section: "analisis" },
  { href: "/tablero",       label: "Tablero de control", icon: LineChart,  section: "analisis" },

  // Sistema
  { href: "/configuracion", label: "Configuración",          icon: Settings,           section: "admin" },
  { href: "/sistema",       label: "Configuración del sistema", icon: SlidersHorizontal, section: "admin", soloSuperadmin: true },
];

const GRUPOS: { key: Seccion; title: string }[] = [
  { key: "inicio",   title: "Inicio" },
  { key: "gestion",  title: "Gestión del SGI" },
  { key: "analisis", title: "Análisis" },
  { key: "admin",    title: "Sistema" },
];

export function Sidebar({ esSuperadmin = false }: { esSuperadmin?: boolean }) {
  const pathname = usePathname();

  // Estado de plegado por grupo. Arranca con el grupo activo abierto
  // y el resto plegado (como pediste: nacen plegadas, se despliegan al clic).
  const seccionActiva = obtenerSeccionActiva(pathname);
  const [abiertos, setAbiertos] = useState<Record<Seccion, boolean>>({
    inicio: seccionActiva === "inicio",
    gestion: seccionActiva === "gestion",
    analisis: seccionActiva === "analisis",
    admin: seccionActiva === "admin",
  });

  function toggle(key: Seccion) {
    setAbiertos((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-background">
      {/* Marca */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
          <span className="font-serif text-sm font-bold">M</span>
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-base font-semibold leading-none tracking-tight">
            MSU
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            SGI Multinorma
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {GRUPOS.map(({ key, title }) => {
          const items = navItems.filter(
            (i) => i.section === key && (!i.soloSuperadmin || esSuperadmin),
          );
          if (items.length === 0) return null;

          const abierto = abiertos[key];
          return (
            <NavGroup
              key={key}
              title={title}
              abierto={abierto}
              onToggle={() => toggle(key)}
              count={items.length}
            >
              {items.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActive(pathname, item.href)}
                />
              ))}
            </NavGroup>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        v1.0 · Build inicial
      </div>
    </aside>
  );
}

function NavGroup({
  title,
  abierto,
  onToggle,
  count,
  children,
}: {
  title: string;
  abierto: boolean;
  onToggle: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={abierto}
        className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80 transition-colors hover:text-foreground"
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200 ease-out",
            abierto && "rotate-90",
          )}
        />
        <span>{title}</span>
        <span className="ml-auto text-[9px] font-normal tabular-nums text-muted-foreground/40">
          {count}
        </span>
      </button>

      {/* Contenedor plegable con animación de altura */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pb-2 pt-0.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 rounded-md py-2 pl-7 pr-3 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/[0.07] text-primary"
          : "text-foreground/65 hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {/* Barra de acento del item activo */}
      <span
        className={cn(
          "absolute left-2.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity duration-150",
          active ? "opacity-100" : "opacity-0",
        )}
        aria-hidden="true"
      />
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function obtenerSeccionActiva(pathname: string): Seccion | null {
  const item = [...navItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => isActive(pathname, i.href));
  return item?.section ?? null;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}
