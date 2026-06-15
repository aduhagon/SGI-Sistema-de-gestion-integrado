"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BarChart3, ChevronUp } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Alterna la visibilidad del tablero embebido en /ncs mediante el parámetro
 * ?tablero=1 en la URL. Conserva los filtros de fecha activos (rango/desde/hasta)
 * al abrir o cerrar, para que el estado del tablero no se pierda al togglear.
 */
export function BotonTablero({ abierto }: { abierto: boolean }) {
  const searchParams = useSearchParams();

  const params = new URLSearchParams(searchParams.toString());
  if (abierto) {
    params.delete("tablero");
  } else {
    params.set("tablero", "1");
  }
  const qs = params.toString();
  const href = qs ? `/ncs?${qs}` : "/ncs";

  return (
    <Link
      href={href}
      scroll={false}
      className={cn(buttonVariants({ variant: "outline" }))}
    >
      {abierto ? (
        <>
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
          Ocultar tablero
        </>
      ) : (
        <>
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
          Ver tablero
        </>
      )}
    </Link>
  );
}
