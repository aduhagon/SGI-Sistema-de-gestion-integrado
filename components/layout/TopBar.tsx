"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CampanaNotificaciones } from "@/components/layout/CampanaNotificaciones";

type Props = {
  userEmail: string;
  usuarioId: string | null;
};

export function TopBar({ userEmail, usuarioId }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      router.push(`/buscar?q=${encodeURIComponent(q)}`);
    }
  }

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-16 items-center bg-[#0f1f3d] text-slate-200">
      {/* Zona de marca — alineada con el ancho del sidebar (256px) */}
      <div className="flex h-full w-64 shrink-0 items-center gap-3 border-r border-white/[0.08] px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-[#0f1f3d] shadow-sm">
          <span className="font-serif text-sm font-bold">M</span>
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-base font-semibold leading-none tracking-tight text-white">
            MSU
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            SGI Multinorma
          </span>
        </div>
      </div>

      {/* Buscador + acciones */}
      <div className="flex flex-1 items-center px-4 sm:px-6">
        <div className="flex-1 max-w-xl">
          <form onSubmit={handleBuscar}>
            <div className="group flex w-full items-center gap-2.5 rounded-lg border border-white/[0.1] bg-white/[0.07] px-3.5 py-2 text-sm transition-all focus-within:border-white/25 focus-within:bg-white/[0.12]">
              <Search
                className="h-4 w-4 text-slate-400 transition-colors group-focus-within:text-slate-200"
                aria-hidden="true"
              />
              <input
                ref={inputRef}
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar documentos, requisitos, procesos…"
                aria-label="Buscar en el SGI"
                className="flex-1 bg-transparent text-white placeholder:text-slate-400 outline-none"
              />
              <kbd className="ml-auto rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-slate-300">
                ⌘K
              </kbd>
            </div>
          </form>
        </div>

        <div className="flex items-center gap-1 ml-4">
          <CampanaNotificaciones usuarioId={usuarioId} />

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.08]"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#0f1f3d] text-xs font-semibold shadow-sm">
                {initials}
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
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
      </div>
    </header>
  );
}
