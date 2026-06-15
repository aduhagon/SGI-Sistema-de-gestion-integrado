"use client";

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
  Settings,
  SlidersHorizontal,
  Activity,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerfilMenu } from "@/lib/api/perfil-menu";
import { useSidebarMobile } from "@/components/layout/SidebarMobileContext";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: "principal" | "calidad" | "admin";
  /** Predicado de visibilidad según el perfil. Si falta, siempre visible. */
  visible?: (p: PerfilMenu) => boolean;
  /** Código de módulo requerido. Si falta, no depende de ningún módulo. */
  modulo?: string;
};

const navItems: NavItem[] = [
  // Operación: visible para todos.
  { href: "/dashboard",     label: "Dashboard",        icon: LayoutDashboard, section: "principal" },
  { href: "/procesos",      label: "Procesos",         icon: Network,         section: "principal" },
  { href: "/documentos",    label: "Documentos",       icon: FileText,        section: "principal" },
  { href: "/aprobaciones",  label: "Aprobaciones",     icon: CheckSquare,     section: "principal",
    visible: (p) => p.esAprobador || p.esGestor },
  { href: "/acuses",        label: "Acuses",           icon: PenSquare,       section: "principal" },

  // Calidad & Auditoría: gestores (admin / responsable_sgi / auditor).
  { href: "/tablero",       label: "Tablero de control", icon: Activity,    section: "calidad",
    visible: (p) => p.esGestor },
  { href: "/cumplimiento/panorama", label: "Cumplimiento", icon: Grid3x3,     section: "calidad",
    visible: (p) => p.esGestor, modulo: "cumplimiento" },
  { href: "/requisitos-legales", label: "Requisitos legales", icon: Scale,    section: "calidad",
    visible: (p) => p.esGestor },
  { href: "/riesgos",       label: "Riesgos",          icon: ShieldAlert,     section: "calidad",
    visible: (p) => p.esGestor, modulo: "riesgos" },
  { href: "/indicadores",   label: "Indicadores",      icon: Gauge,           section: "calidad",
    visible: (p) => p.esGestor, modulo: "indicadores" },
  { href: "/auditorias",    label: "Auditorías",       icon: ClipboardCheck,  section: "calidad",
    visible: (p) => p.esGestor, modulo: "auditorias" },
  { href: "/ncs",           label: "No conformidades", icon: AlertOctagon,    section: "calidad",
    visible: (p) => p.esGestor, modulo: "no_conformidades" },

  // Sistema: solo gestores.
  { href: "/configuracion", label: "Configuración",    icon: Settings,        section: "admin",
    visible: (p) => p.esGestor },
  { href: "/sistema",       label: "Configuración del sistema", icon: SlidersHorizontal, section: "admin",
    visible: (p) => p.esSuperadmin },
];

function visibleParaPerfil(item: NavItem, perfil: PerfilMenu): boolean {
  // Si el item depende de un módulo y ese módulo no está habilitado, se oculta.
  if (item.modulo && !perfil.modulosHabilitados.includes(item.modulo)) {
    return false;
  }
  return item.visible ? item.visible(perfil) : true;
}

export function SidebarNav({ perfil }: { perfil: PerfilMenu }) {
  const { abierto, cerrar } = useSidebarMobile();

  return (
    <>
      {/* Desktop: barra lateral fija */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-[#16367f] text-white">
        <MenuContenido perfil={perfil} />
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
            "absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-[#16367f] text-white shadow-2xl transition-transform duration-300 ease-out",
            abierto ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-[#16367f]">
                <span className="font-serif text-sm font-bold">M</span>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-base font-semibold leading-none tracking-tight text-white">
                  MSU
                </span>
                <span className="text-[10px] uppercase tracking-[0.15em] text-white/55">
                  SGI Multinorma
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar menú"
              className="rounded-md p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <MenuContenido perfil={perfil} onNavegar={cerrar} conCabecera={false} />
        </div>
      </div>
    </>
  );
}

/**
 * Contenido del menú reutilizado por el aside (desktop) y el drawer (mobile).
 * En desktop incluye su propia cabecera de marca; en mobile la cabecera la pone
 * el panel del drawer (con el botón de cierre), por eso `conCabecera`.
 */
function MenuContenido({
  perfil,
  onNavegar,
  conCabecera = true,
}: {
  perfil: PerfilMenu;
  onNavegar?: () => void;
  conCabecera?: boolean;
}) {
  const pathname = usePathname();

  const visibles = navItems.filter((i) => visibleParaPerfil(i, perfil));
  const principal = visibles.filter((i) => i.section === "principal");
  const calidad = visibles.filter((i) => i.section === "calidad");
  const admin = visibles.filter((i) => i.section === "admin");

  return (
    <>
      {conCabecera && (
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-[#16367f]">
            <span className="font-serif text-sm font-bold">M</span>
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-base font-semibold leading-none tracking-tight text-white">
              MSU
            </span>
            <span className="text-[10px] uppercase tracking-[0.15em] text-white/55">
              SGI Multinorma
            </span>
          </div>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {principal.length > 0 && (
          <NavGroup title="Operación">
            {principal.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={onNavegar} />
            ))}
          </NavGroup>
        )}

        {calidad.length > 0 && (
          <NavGroup title="Calidad & Auditoría">
            {calidad.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={onNavegar} />
            ))}
          </NavGroup>
        )}

        {admin.length > 0 && (
          <NavGroup title="Sistema">
            {admin.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} onClick={onNavegar} />
            ))}
          </NavGroup>
        )}
      </nav>

      <div className="border-t border-white/10 p-4 text-[10px] uppercase tracking-wider text-white/45">
        v1.0 · Build inicial
      </div>
    </>
  );
}

function NavGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h4 className="px-3 mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-white/45">
        {title}
      </h4>
      <div className="space-y-0.5">{children}</div>
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
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/15 text-white"
          : "text-white/75 hover:bg-white/10 hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  // "Cumplimiento" apunta a /cumplimiento/panorama pero debe quedar activo
  // también en la matriz detallada (/cumplimiento y /cumplimiento?norma=...).
  if (href === "/cumplimiento/panorama") return pathname.startsWith("/cumplimiento");
  return pathname.startsWith(href);
}
