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
  ListChecks,
  ClipboardCheck,
  AlertOctagon,
  Grid3x3,
  ShieldAlert,
  Gauge,
  Scale,
  LineChart,
  Workflow,
  Table2,
  Users,
  Settings,
  SlidersHorizontal,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarMobile } from "@/components/layout/SidebarMobileContext";

type Seccion = "inicio" | "gestion" | "analisis" | "admin";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: Seccion;
  soloSuperadmin?: boolean;
  soloAdminSgi?: boolean;
  modulo?: string; // código en modulos_sistema; si está, solo se muestra si el módulo está habilitado
  /** Sub-items que cuelgan de este item (un solo nivel de anidamiento). */
  children?: NavHijo[];
};

type NavHijo = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  modulo?: string;
};

const navItems: NavItem[] = [
  // Inicio — el trabajo pendiente del usuario.
  // Aprobaciones y Acuses cuelgan de Mis pendientes: son las dos bandejas
  // donde el usuario resuelve lo que Mis pendientes le muestra.
  {
    href: "/mis-pendientes",
    label: "Mis pendientes",
    icon: ListChecks,
    section: "inicio",
    children: [
      { href: "/aprobaciones", label: "Aprobaciones", icon: CheckSquare },
      { href: "/acuses",       label: "Acuses",       icon: PenSquare },
    ],
  },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, section: "inicio" },

  // Gestión del SGI — registros que se mantienen
  { href: "/documentos",         label: "Documentos",         icon: FileText,       section: "gestion", modulo: "documentos" },
  { href: "/procesos",           label: "Procesos",           icon: Network,        section: "gestion", modulo: "procesos" },
  { href: "/flujogramas",        label: "Flujogramas",        icon: Workflow,       section: "gestion", modulo: "flujogramas" },
  { href: "/cumplimiento",       label: "Cumplimiento",       icon: Grid3x3,        section: "gestion", modulo: "cumplimiento" },
  { href: "/requisitos-legales", label: "Requisitos legales", icon: Scale,          section: "gestion" },
  { href: "/riesgos",            label: "Riesgos",            icon: ShieldAlert,    section: "gestion", modulo: "riesgos" },
  { href: "/auditorias",         label: "Auditorías",         icon: ClipboardCheck, section: "gestion", modulo: "auditorias" },
  { href: "/ncs",                label: "No conformidades",   icon: AlertOctagon,   section: "gestion", modulo: "no_conformidades" },

  // Análisis — lectura / reporte
  { href: "/indicadores",   label: "Indicadores",        icon: Gauge,      section: "analisis", modulo: "indicadores" },
  { href: "/tablero",       label: "Tablero de control", icon: LineChart,  section: "analisis" },
  { href: "/reportes/raci", label: "Matriz RACI",        icon: Table2,     section: "analisis", soloAdminSgi: true },
  { href: "/reportes/personas", label: "Perfil por persona", icon: Users,  section: "analisis", soloAdminSgi: true },

  // Sistema
  { href: "/configuracion", label: "Configuración",             icon: Settings,           section: "admin" },
  { href: "/sistema",       label: "Configuración del sistema", icon: SlidersHorizontal,  section: "admin", soloSuperadmin: true },
];

const GRUPOS: { key: Seccion; title: string }[] = [
  { key: "inicio",   title: "Inicio" },
  { key: "gestion",  title: "Gestión del SGI" },
  { key: "analisis", title: "Análisis" },
  { key: "admin",    title: "Sistema" },
];

export function Sidebar({ esSuperadmin = false, esAdminSgi = false, modulosHabilitados = [] }: { esSuperadmin?: boolean; esAdminSgi?: boolean; modulosHabilitados?: string[] }) {
  const { abierto, cerrar } = useSidebarMobile();

  return (
    <>
      {/* Desktop: barra lateral fija */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-background">
        <MenuContenido esSuperadmin={esSuperadmin} esAdminSgi={esAdminSgi} modulosHabilitados={modulosHabilitados} />
      </aside>

      {/* Mobile: drawer deslizable con overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          abierto ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!abierto}
      >
        {/* Overlay */}
        <div
          onClick={cerrar}
          className={cn(
            "absolute inset-0 bg-foreground/50 backdrop-blur-sm transition-opacity duration-300",
            abierto ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Panel */}
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú de navegación"
          className={cn(
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-background shadow-2xl transition-transform duration-300 ease-out",
            abierto ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {/* Cabecera del drawer: marca + cerrar (solo en mobile, para orientar) */}
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <span className="font-serif text-sm font-bold">M</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-base font-semibold leading-none tracking-tight">
                  MSU
                </span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  SGI Multinorma
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar menú"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-primary/[0.06] hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <MenuContenido esSuperadmin={esSuperadmin} esAdminSgi={esAdminSgi} modulosHabilitados={modulosHabilitados} onNavegar={cerrar} />
        </div>
      </div>
    </>
  );
}

/**
 * Contenido del menú (grupos colapsables) reutilizado por el aside desktop y el
 * drawer mobile. El estado de apertura de cada grupo es independiente por
 * instancia, lo cual está bien: son árboles separados que no coexisten visibles.
 */
function MenuContenido({
  esSuperadmin,
  esAdminSgi,
  modulosHabilitados,
  onNavegar,
}: {
  esSuperadmin: boolean;
  esAdminSgi: boolean;
  modulosHabilitados: string[];
  onNavegar?: () => void;
}) {
  const pathname = usePathname();

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
    <>
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {GRUPOS.map(({ key, title }) => {
          const items = navItems.filter(
            (i) =>
              i.section === key &&
              (!i.soloSuperadmin || esSuperadmin) &&
              (!i.soloAdminSgi || esAdminSgi) &&
              (!i.modulo || modulosHabilitados.includes(i.modulo)),
          );
          if (items.length === 0) return null;

          // El contador del grupo incluye los sub-items visibles.
          const count = items.reduce(
            (n, i) =>
              n +
              1 +
              (i.children ?? []).filter(
                (h) => !h.modulo || modulosHabilitados.includes(h.modulo),
              ).length,
            0,
          );

          const abierto = abiertos[key];
          return (
            <NavGroup
              key={key}
              title={title}
              abierto={abierto}
              onToggle={() => toggle(key)}
              count={count}
            >
              {items.map((item) => {
                const hijos = (item.children ?? []).filter(
                  (h) => !h.modulo || modulosHabilitados.includes(h.modulo),
                );

                if (hijos.length === 0) {
                  return (
                    <NavLink
                      key={item.href}
                      item={item}
                      active={isActive(pathname, item.href)}
                      onClick={onNavegar}
                    />
                  );
                }

                return (
                  <NavItemConHijos
                    key={item.href}
                    item={item}
                    hijos={hijos}
                    pathname={pathname}
                    onNavegar={onNavegar}
                  />
                );
              })}
            </NavGroup>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60">
        v1.0 · Build inicial
      </div>
    </>
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
        className="group flex w-full items-center gap-2 rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary/75 transition-colors hover:text-primary"
      >
        <ChevronRight
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200 ease-out",
            abierto && "rotate-90",
          )}
        />
        <span>{title}</span>
        <span className="ml-auto text-[9px] font-normal tabular-nums text-muted-foreground/50">
          {count}
        </span>
      </button>

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

/**
 * Item padre con sub-items. El padre sigue siendo un link navegable (a
 * /mis-pendientes); el chevron es un botón aparte para abrir/cerrar los hijos,
 * de modo que hacer click en el label no obligue a desplegar.
 * Arranca abierto si la ruta actual es el padre o alguno de sus hijos.
 */
function NavItemConHijos({
  item,
  hijos,
  pathname,
  onNavegar,
}: {
  item: NavItem;
  hijos: NavHijo[];
  pathname: string;
  onNavegar?: () => void;
}) {
  const padreActivo = isActive(pathname, item.href);
  const algunHijoActivo = hijos.some((h) => isActive(pathname, h.href));

  const [abierto, setAbierto] = useState(padreActivo || algunHijoActivo);

  const Icon = item.icon;

  return (
    <div>
      <div
        className={cn(
          "group relative flex items-center rounded-md pr-1 transition-all duration-150",
          padreActivo
            ? "bg-primary/[0.09] text-primary"
            : "text-foreground/70 hover:bg-primary/[0.05] hover:text-foreground",
        )}
      >
        {/* Barra de acento del item activo */}
        <span
          className={cn(
            "absolute left-2.5 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary transition-opacity duration-150",
            padreActivo ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        />

        <Link
          href={item.href}
          onClick={onNavegar}
          className="flex flex-1 items-center gap-3 py-2 pl-7 text-sm font-medium"
        >
          <Icon
            className={cn(
              "h-4 w-4 shrink-0 transition-colors",
              padreActivo
                ? "text-primary"
                : "text-muted-foreground group-hover:text-foreground",
            )}
          />
          <span className="truncate">{item.label}</span>
        </Link>

        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          aria-expanded={abierto}
          aria-label={abierto ? `Contraer ${item.label}` : `Expandir ${item.label}`}
          className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-200 ease-out",
              abierto && "rotate-90",
            )}
          />
        </button>
      </div>

      {/* Sub-items */}
      <div
        className={cn(
          "grid transition-all duration-200 ease-out",
          abierto ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pt-0.5">
            {hijos.map((hijo) => {
              const HijoIcon = hijo.icon;
              const activo = isActive(pathname, hijo.href);
              return (
                <Link
                  key={hijo.href}
                  href={hijo.href}
                  onClick={onNavegar}
                  tabIndex={abierto ? undefined : -1}
                  className={cn(
                    "group relative ml-7 flex items-center gap-2.5 rounded-md border-l border-border py-1.5 pl-4 pr-3 text-[13px] font-medium transition-all duration-150",
                    activo
                      ? "border-l-primary bg-primary/[0.07] text-primary"
                      : "text-foreground/60 hover:bg-primary/[0.04] hover:text-foreground",
                  )}
                >
                  <HijoIcon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition-colors",
                      activo
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  />
                  <span className="truncate">{hijo.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "group relative flex items-center gap-3 rounded-md py-2 pl-7 pr-3 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary/[0.09] text-primary"
          : "text-foreground/70 hover:bg-primary/[0.05] hover:text-foreground",
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
  // Aplanar padres e hijos: si estamos en /acuses (hijo), la sección activa
  // debe seguir siendo la del padre (/mis-pendientes -> "inicio").
  const planos: { href: string; section: Seccion }[] = navItems.flatMap((i) => [
    { href: i.href, section: i.section },
    ...(i.children ?? []).map((h) => ({ href: h.href, section: i.section })),
  ]);

  const item = planos
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => isActive(pathname, i.href));

  return item?.section ?? null;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}
