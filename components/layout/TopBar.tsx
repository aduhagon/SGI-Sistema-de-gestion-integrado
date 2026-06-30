"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, LogOut, User as UserIcon, ChevronDown, Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CampanaNotificaciones } from "@/components/layout/CampanaNotificaciones";
import { useSidebarMobile } from "@/components/layout/SidebarMobileContext";

type Props = {
  userEmail: string;
  usuarioId: string | null;
};

export function TopBar({ userEmail, usuarioId }: Props) {
  const router = useRouter();
  const { alternar } = useSidebarMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  // En mobile el buscador arranca colapsado y se despliega a pantalla completa.
  const [buscadorMovilAbierto, setBuscadorMovilAbierto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputMovilRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Atajo ⌘K / Ctrl+K para enfocar el buscador.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Al abrir el buscador móvil, enfocarlo.
  useEffect(() => {
    if (buscadorMovilAbierto) inputMovilRef.current?.focus();
  }, [buscadorMovilAbierto]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    const q = busqueda.trim();
    if (q.length >= 2) {
      setBuscadorMovilAbierto(false);
      router.push(`/buscar?q=${encodeURIComponent(q)}`);
    }
  }

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="relative flex h-16 items-center bg-sidebar text-sidebar-foreground">
      {/* Hamburguesa — solo mobile */}
      <button
        type="button"
        onClick={alternar}
        aria-label="Abrir menú"
        className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/[0.08] hover:text-sidebar-foreground md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Zona de marca — única (solo acá). Ancho fijo 256px alineado al sidebar en desktop. */}
      <div className="flex h-full items-center gap-3 px-4 md:w-64 md:shrink-0 md:border-r md:border-sidebar-foreground/[0.08] md:px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-foreground text-sidebar shadow-sm">
          <span className="font-serif text-sm font-bold">M</span>
        </div>
        <div className="hidden flex-col sm:flex">
          <span className="font-serif text-base font-semibold leading-none tracking-tight text-sidebar-foreground">
            MSU
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/60">
            SGI Multinorma
          </span>
        </div>
      </div>

      {/* Buscador centrado — visible desde sm en adelante */}
      <div className="hidden flex-1 items-center justify-center px-4 sm:flex sm:px-6">
        <div className="w-full max-w-xl">
          <form onSubmit={handleBuscar}>
            <div className="group flex w-full items-center gap-2.5 rounded-lg border border-sidebar-accent/35 bg-sidebar-accent/15 px-3.5 py-2 text-sm transition-all focus-within:border-sidebar-accent/55 focus-within:bg-sidebar-accent/[0.22]">
              <Search
                className="h-4 w-4 text-sidebar-accent transition-colors group-focus-within:text-sidebar-accent/80"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar documentos, requisitos, procesos…"
                aria-label="Buscar en el SGI"
                className="flex-1 bg-transparent text-sidebar-foreground placeholder:text-sidebar-accent/80 outline-none"
              />
              <kbd className="ml-auto rounded border border-sidebar-accent/30 bg-sidebar-accent/10 px-1.5 py-0.5 text-[10px] font-mono text-sidebar-accent">
                ⌘K
              </kbd>
            </div>
          </form>
        </div>
      </div>

      {/* Espaciador en mobile (sin buscador inline) para empujar acciones a la derecha */}
      <div className="flex-1 sm:hidden" />

      {/* Acciones — siempre al extremo derecho */}
      <div className="flex shrink-0 items-center gap-1 px-3 sm:px-6">
        {/* Lupa que abre el buscador a pantalla completa — solo mobile */}
        <button
          type="button"
          onClick={() => setBuscadorMovilAbierto(true)}
          aria-label="Buscar"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/[0.08] hover:text-sidebar-foreground sm:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        <CampanaNotificaciones usuarioId={usuarioId} />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-sidebar-foreground/[0.08]"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-foreground text-sidebar text-xs font-semibold shadow-sm">
              {initials}
            </div>
            <ChevronDown
              className={`hidden h-3.5 w-3.5 text-sidebar-foreground/60 transition-transform duration-200 sm:block ${menuOpen ? "rotate-180" : ""}`}
            />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-border bg-card text-foreground shadow-xl overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                  Sesión activa
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </div>
                  <div className="text-sm font-medium truncate">{userEmail}</div>
                </div>
              </div>
              <div className="p-1.5">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Mi perfil
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/5"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Buscador a pantalla completa — solo mobile */}
      {buscadorMovilAbierto && (
        <div className="absolute inset-0 z-50 flex items-center gap-2 bg-sidebar px-3 sm:hidden">
          <form onSubmit={handleBuscar} className="flex-1">
            <div className="flex w-full items-center gap-2.5 rounded-lg border border-sidebar-accent/35 bg-sidebar-accent/15 px-3.5 py-2 text-sm">
              <Search className="h-4 w-4 text-sidebar-accent" aria-hidden="true" />
              <input
                ref={inputMovilRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar en el SGI…"
                aria-label="Buscar en el SGI"
                className="flex-1 bg-transparent text-sidebar-foreground placeholder:text-sidebar-accent/80 outline-none"
              />
            </div>
          </form>
          <button
            type="button"
            onClick={() => setBuscadorMovilAbierto(false)}
            aria-label="Cerrar búsqueda"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/[0.08] hover:text-sidebar-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </header>
  );
}
