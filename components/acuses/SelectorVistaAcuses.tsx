"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Users, Network, Building } from "lucide-react";

type Vista = "usuario" | "proceso" | "gerencia";

const TABS: Array<{ id: Vista; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "usuario", label: "Por usuario", icon: Users },
  { id: "proceso", label: "Por proceso", icon: Network },
  { id: "gerencia", label: "Por gerencia", icon: Building },
];

export function SelectorVistaAcuses({ vistaActual }: { vistaActual: Vista }) {
  const router = useRouter();
  const params = useSearchParams();

  function ir(v: Vista) {
    const p = new URLSearchParams(params.toString());
    if (v === "usuario") p.delete("vista");
    else p.set("vista", v);
    router.push(`/acuses-pendientes${p.toString() ? "?" + p.toString() : ""}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
      {TABS.map((t) => {
        const activo = t.id === vistaActual;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => ir(t.id)}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
              (activo
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
