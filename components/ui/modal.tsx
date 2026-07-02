"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Cáscara compartida para todos los modales del SGI.
 *
 * Estructura de 3 zonas para que los botones nunca queden fuera de pantalla
 * en monitores chicos (notebooks):
 *
 *   <ModalShell abierto={...} onClose={...} maxWidth="max-w-2xl">
 *     <ModalHeader>  ← fijo (título, subtítulo, indicador de pasos)
 *     <ModalBody>    ← lo ÚNICO que scrollea
 *     <ModalFooter>  ← fijo (errores + botones, siempre visibles)
 *   </ModalShell>
 *
 * Si el contenido es un formulario cuyo submit vive en el footer, el <form>
 * debe envolver ModalBody + ModalFooter y llevar la clase MODAL_FORM_CLASS
 * para no romper el layout flex:
 *
 *   <ModalShell ...>
 *     <ModalHeader>…</ModalHeader>
 *     <form action={...} className={MODAL_FORM_CLASS}>
 *       <ModalBody>…campos…</ModalBody>
 *       <ModalFooter>…botones…</ModalFooter>
 *     </form>
 *   </ModalShell>
 *
 * La cáscara maneja: overlay con blur, cierre con Escape, cierre al clickear
 * afuera, alto máximo de 85vh y recorte de esquinas redondeadas.
 */
export function ModalShell({
  abierto,
  onClose,
  maxWidth = "max-w-lg",
  children,
}: {
  abierto: boolean;
  onClose: () => void;
  /** Clase Tailwind de ancho máximo (ej: "max-w-md", "max-w-2xl"). */
  maxWidth?: string;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (abierto) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [abierto, onClose]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        className={`relative z-10 flex max-h-[85vh] w-full ${maxWidth} flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl`}
      >
        {children}
      </div>
    </div>
  );
}

/** Clase para el <form> que envuelve ModalBody + ModalFooter. */
export const MODAL_FORM_CLASS = "flex min-h-0 flex-1 flex-col";

/** Zona superior fija: título, subtítulo, indicador de pasos. */
export function ModalHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`shrink-0 px-6 pt-6 pb-4 ${className ?? ""}`}>{children}</div>;
}

/** Zona central: lo único que scrollea cuando el contenido no entra. */
export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-0 flex-1 overflow-y-auto px-6 py-1 ${className ?? ""}`}>{children}</div>;
}

/**
 * Zona inferior fija: errores y botones, siempre visibles.
 * Los mensajes de error van acá (y no al final del body) para que nunca
 * queden ocultos por el scroll.
 */
export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`shrink-0 border-t border-border px-6 py-4 ${className ?? ""}`}>{children}</div>;
}

/** Alerta de error estándar de los modales. No renderiza nada si mensaje es null/undefined. */
export function ModalError({ mensaje }: { mensaje: string | null | undefined }) {
  if (!mensaje) return null;
  return (
    <div role="alert" className="mb-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {mensaje}
    </div>
  );
}
