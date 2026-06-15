"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, ShieldCheck } from "lucide-react";

type Vista = "mias" | "todas";

export function SelectorVistaAprobaciones({ vistaActual }: { vistaActual: Vista }) {
  const router = useRouter();
  const params = useSearchParams();

  function ir(v: Vista) {
    const p = new URLSearchParams(params.toString());
    if (v === "mias") p.delete("vista");
    else p.set("vista", v);
    router.push(`/aprobaciones${p.toString() ? "?" + p.toString() : ""}`);
  }

  const tabs: Array<{ id: Vista; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: "mias", label: "Mis pendientes", icon: Inbox },
    { id: "todas", label: "Todas (admin)", icon: ShieldCheck },
  ];

  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
      {tabs.map((t) => {
        const activo = t.id === vistaActual;
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => ir(t.id)}
            className={
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
              (activo ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")
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
