"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type SidebarMobileCtx = {
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
  alternar: () => void;
};

const Ctx = createContext<SidebarMobileCtx | null>(null);

/**
 * Provee el estado del drawer lateral en mobile. Envuelve la fila inferior del
 * layout para que el botón hamburguesa (en el TopBar) y el panel deslizable
 * (en el Sidebar) compartan un único estado sin pasar props por el layout,
 * que es un server component.
 */
export function SidebarMobileProvider({ children }: { children: ReactNode }) {
  const [abierto, setAbierto] = useState(false);

  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);
  const alternar = useCallback(() => setAbierto((v: boolean) => !v), []);

  return (
    <Ctx.Provider value={{ abierto, abrir, cerrar, alternar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSidebarMobile(): SidebarMobileCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Fallback inerte: permite usar el hook fuera del provider sin romper
    // (por ejemplo en tests o en pantallas que no montan el layout completo).
    return { abierto: false, abrir: () => {}, cerrar: () => {}, alternar: () => {} };
  }
  return ctx;
}
