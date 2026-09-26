"use client";

import { useEffect, useRef, type ReactNode } from "react";

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
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (abierto) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [abierto, onClose]);

  useEffect(() => {
    if (!abierto) return;

    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const panel = panelRef.current;
    const primerControl = panel?.querySelector<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    (primerControl ?? panel)?.focus();

    return () => {
      document.body.style.overflow = overflowAnterior;
      focoAnterior?.focus();
    };
  }, [abierto]);

  if (!abierto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Ventana de diálogo">
      <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`relative z-10 flex h-[100dvh] max-h-[100dvh] w-full ${maxWidth} flex-col overflow-hidden border border-border bg-card shadow-2xl sm:h-auto sm:max-h-[85vh] sm:rounded-xl`}
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
  return <div className={`shrink-0 px-4 pb-4 pt-5 sm:px-6 sm:pt-6 ${className ?? ""}`}>{children}</div>;
}

/** Zona central: lo único que scrollea cuando el contenido no entra. */
export function ModalBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`min-h-0 flex-1 overflow-y-auto px-4 py-1 sm:px-6 ${className ?? ""}`}>{children}</div>;
}

/**
 * Zona inferior fija: errores y botones, siempre visibles.
 * Los mensajes de error van acá (y no al final del body) para que nunca
 * queden ocultos por el scroll.
 */
export function ModalFooter({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`shrink-0 border-t border-border bg-card px-4 py-3 sm:px-6 sm:py-4 ${className ?? ""}`}>{children}</div>;
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
