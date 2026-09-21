"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertOctagon, Loader2 } from "lucide-react";
import { crearNCDesdeControl } from "@/app/(app)/controles/actions";
import { Button } from "@/components/ui/button";

export function AbrirNCControl({ ejecucionId }: { ejecucionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return <div><Button size="sm" variant="outline" disabled={pending} onClick={() => {
    setError(null);
    startTransition(async () => {
      const resultado = await crearNCDesdeControl(ejecucionId);
      if (resultado.ok) router.push(`/ncs/${resultado.id}?creada=1`);
      else setError(resultado.error);
    });
  }}>{pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertOctagon className="h-4 w-4" />}Abrir no conformidad</Button>
    {error && <p role="alert" className="mt-2 max-w-sm text-sm text-destructive">{error}</p>}
  </div>;
}
