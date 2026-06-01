"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, Bell, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

type Props = {
  userEmail: string;
};

export function TopBar({ userEmail }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar menú al click afuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userEmail.slice(0, 2).toUpperCase();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      {/* Búsqueda global (placeholder, funcional en próximas pantallas) */}
      <div className="flex-1 max-w-xl">
        <button
          type="button"
          className="group flex w-full items-center gap-2.5 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground hover:border-foreground/20 hover:bg-muted transition-colors"
          aria-label="Buscar en el SGI"
        >
          <Search className="h-4 w-4" />
          <span>Buscar documentos, requisitos, procesos…</span>
          <kbd className="ml-auto rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Acciones de usuario */}
      <div className="flex items-center gap-2 ml-4">
        {/* Notificaciones (placeholder, funcional en próxima pantalla) */}
        <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative">
          <Bell className="h-4 w-4" />
          {/* Badge de no leídas (placeholder visual) */}
          <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-accent" />
        </Button>

        {/* Menú de usuario */}
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
