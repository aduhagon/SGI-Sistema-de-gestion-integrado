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
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerfilMenu } from "@/lib/api/perfil-menu";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: "principal" | "calidad" | "admin";
  /** Predicado de visibilidad según el perfil. Si falta, siempre visible. */
  visible?: (p: PerfilMenu) => boolean;
};

const navItems: NavItem[] = [
  // Operación: visible para todos.
  { href: "/dashboard",    label: "Dashboard",        icon: LayoutDashboard, section: "principal" },
  { href: "/procesos",     label: "Procesos",         icon: Network,         section: "principal" },
  { href: "/documentos",   label: "Documentos",       icon: FileText,        section: "principal" },
  { href: "/aprobaciones", label: "Aprobaciones",     icon: CheckSquare,     section: "principal",
    visible: (p) => p.esAprobador || p.esGestor },
  { href: "/acuses",       label: "Acuses",           icon: PenSquare,       section: "principal" },

  // Calidad & Auditoría: gestores (admin / responsable_sgi / auditor).
  { href: "/cumplimiento", label: "Cumplimiento",     icon: Grid3x3,         section: "calidad",
    visible: (p) => p.esGestor },
  { href: "/riesgos",      label: "Riesgos",          icon: ShieldAlert,     section: "calidad",
    visible: (p) => p.esGestor },
  { href: "/indicadores",  label: "Indicadores",      icon: Gauge,           section: "calidad",
    visible: (p) => p.esGestor },
  { href: "/auditorias",   label: "Auditorías",       icon: ClipboardCheck,  section: "calidad",
    visible: (p) => p.esGestor },
  { href: "/ncs",          label: "No conformidades", icon: AlertOctagon,    section: "calidad",
    visible: (p) => p.esGestor },

  // Sistema: solo gestores.
  { href: "/configuracion", label: "Configuración",   icon: Settings,        section: "admin",
    visible: (p) => p.esGestor },
];

function visibleParaPerfil(item: NavItem, perfil: PerfilMenu): boolean {
  return item.visible ? item.visible(perfil) : true;
}

export function SidebarNav({ perfil }: { perfil: PerfilMenu }) {
  const pathname = usePathname();

  const visibles = navItems.filter((i) => visibleParaPerfil(i, perfil));
  const principal = visibles.filter((i) => i.section === "principal");
  const calidad = visibles.filter((i) => i.section === "calidad");
  const admin = visibles.filter((i) => i.section === "admin");

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-background">
      <div className="flex h-16 items-center gap-3 border-b border-border px-6">
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

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {principal.length > 0 && (
          <NavGroup title="Operación">
            {principal.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </NavGroup>
        )}

        {calidad.length > 0 && (
          <NavGroup title="Calidad & Auditoría">
            {calidad.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </NavGroup>
        )}

        {admin.length > 0 && (
          <NavGroup title="Sistema">
            {admin.map((item) => (
              <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
          </NavGroup>
        )}
      </nav>

      <div className="border-t border-border p-4 text-[10px] uppercase tracking-wider text-muted-foreground">
        v1.0 · Build inicial
      </div>
    </aside>
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
      <h4 className="px-3 mb-2 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
        {title}
      </h4>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary/10 text-primary"
          : "text-foreground/70 hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{item.label}</span>
    </Link>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}
