"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ArrowUpRight } from "lucide-react";

type Props = {
  /** Ícono de la sección (lucide). */
  icon: React.ComponentType<{ className?: string }>;
  /** Título corto de la sección. */
  titulo: string;
  /** Conteo / resumen breve que se ve siempre, aun cerrada. Ej: "4 en total". */
  conteo: string;
  /**
   * Señal crítica opcional que se muestra en el header aunque la sección
   * esté cerrada (ej: badge "1 alto", "2 abiertas"). Si no hay nada crítico,
   * se omite.
   */
  senalCritica?: { texto: string; cls: string } | null;
  /** Link "Ver todos" opcional, alineado a la derecha del header. */
  href?: string;
  hrefLabel?: string;
  /** Color de acento del ícono (hex). */
  colorIcono?: string;
  /** Estado inicial. Por defecto cerrada. */
  defaultAbierto?: boolean;
  children: React.ReactNode;
};

export function SeccionColapsable({
  icon: Icon,
  titulo,
  conteo,
  senalCritica,
  href,
  hrefLabel,
  colorIcono = "#64748b",
  defaultAbierto = false,
  children,
}: Props) {
  const [abierto, setAbierto] = useState(defaultAbierto);

  return (
    <section className="mb-3 overflow-hidden rounded-lg border border-border bg-card">
      <div
        className="flex cursor-pointer select-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
        onClick={() => setAbierto((v) => !v)}
        role="button"
        aria-expanded={abierto}
      >
        <span className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
          <ChevronRight
            className={"h-4 w-4 transition-transform " + (abierto ? "rotate-90" : "")}
            aria-hidden="true"
          />
        </span>

        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ backgroundColor: `${colorIcono}18`, color: colorIcono }}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-foreground">
            {titulo}
          </h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{conteo}</p>
        </div>

        {senalCritica && (
          <span
            className={`hidden shrink-0 items-center rounded-md border px-2 py-0.5 text-[11px] font-medium sm:inline-flex ${senalCritica.cls}`}
          >
            {senalCritica.texto}
          </span>
        )}

        {href && hrefLabel && (
          <Link
            href={href}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="hidden shrink-0 items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline sm:inline-flex"
          >
            {hrefLabel}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>

      {abierto && <div className="border-t border-border">{children}</div>}
    </section>
  );
}
