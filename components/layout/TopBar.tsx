"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
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
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex-1 max-w-xl">
        <form onSubmit={handleBuscar}>
          <div className="group flex w-full items-center gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm focus-within:border-foreground/30 focus-within:bg-background transition-colors">
            <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar documentos, requisitos, procesos…"
              aria-label="Buscar en el SGI"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none"
            />
            <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <CampanaNotificaciones usuarioId={usuarioId} />

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
              {initials}
            </div>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-64 origin-top-right rounded-md border border-border bg-card shadow-lg overflow-hidden z-50"
            >
              <div className="px-4 py-3 border-b border-border">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                  Sesión activa
                </div>
                <div className="text-sm font-medium truncate">{userEmail}</div>
              </div>
              <div className="p-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  <UserIcon className="h-4 w-4" />
                  Mi perfil
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
