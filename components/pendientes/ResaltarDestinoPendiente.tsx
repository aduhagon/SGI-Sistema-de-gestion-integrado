"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

type EstadoDestino = "sin-ancla" | "encontrado" | "faltante";

type Props = {
  encontradoMensaje?: string;
  faltanteMensaje?: string;
};

const CLASES_RESALTADO = [
  "rounded-lg",
  "ring-2",
  "ring-primary/25",
  "bg-primary/5",
  "transition-colors",
];

export function ResaltarDestinoPendiente({
  encontradoMensaje = "Ubicamos la sección indicada desde el Centro de pendientes. Revisá ese bloque para cerrar la tarea.",
  faltanteMensaje = "No encontramos la sección exacta indicada por el pendiente. Puede haber sido resuelta o la pantalla cambió.",
}: Props) {
  const [estado, setEstado] = useState<EstadoDestino>("sin-ancla");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;

    const id = decodeURIComponent(hash);
    const elemento = document.getElementById(id);

    if (!elemento) {
      setEstado("faltante");
      return;
    }

    setEstado("encontrado");
    const teniaTabIndex = elemento.hasAttribute("tabindex");
    const tabIndexPrevio = elemento.getAttribute("tabindex");

    elemento.classList.add(...CLASES_RESALTADO);
    if (elemento instanceof HTMLElement) {
      if (!teniaTabIndex) elemento.setAttribute("tabindex", "-1");
      elemento.scrollIntoView({ behavior: "smooth", block: "center" });
      elemento.focus({ preventScroll: true });
    }

    return () => {
      elemento.classList.remove(...CLASES_RESALTADO);
      if (!teniaTabIndex) {
        elemento.removeAttribute("tabindex");
      } else if (tabIndexPrevio !== null) {
        elemento.setAttribute("tabindex", tabIndexPrevio);
      }
    };
  }, []);

  if (estado === "sin-ancla") return null;

  const encontrado = estado === "encontrado";

  return (
    <div
      className={cn(
        "mb-6 flex items-start gap-3 rounded-md border px-4 py-3 text-sm",
        encontrado
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-amber-500/30 bg-amber-500/5 text-amber-800",
      )}
      role="status"
    >
      {encontrado ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      ) : (
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <span>{encontrado ? encontradoMensaje : faltanteMensaje}</span>
    </div>
  );
}
