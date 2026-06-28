"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Save, Check, Globe } from "lucide-react";
import { guardarZonaHoraria, type EstadoAjustes } from "@/app/(app)/configuracion/ajustes/actions";
import { ZONAS_HORARIAS } from "@/lib/zonas-horarias";
import { Button } from "@/components/ui/button";

function SubmitButton({ cambiado }: { cambiado: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || !cambiado}>
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Guardando…</>
      ) : (
        <><Save className="h-4 w-4" aria-hidden="true" />Guardar</>
      )}
    </Button>
  );
}

export function SelectorZonaHoraria({ zonaActual }: { zonaActual: string }) {
  const router = useRouter();
  const [estado, formAction] = useFormState<EstadoAjustes, FormData>(guardarZonaHoraria, null);
  const [seleccion, setSeleccion] = useState(zonaActual);
  const [guardadoOk, setGuardadoOk] = useState(false);

  useEffect(() => {
    if (estado?.ok) {
      setGuardadoOk(true);
      router.refresh();
      const t = setTimeout(() => setGuardadoOk(false), 3000);
      return () => clearTimeout(t);
    }
  }, [estado, router]);

  const cambiado = seleccion !== zonaActual;

  return (
    <form action={formAction} className="rounded-lg border border-border bg-card p-5">
      <div className="mb-1 flex items-center gap-2">
        <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <label htmlFor="zona" className="font-medium">
          Zona horaria del sistema
        </label>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Define cómo se calculan los vencimientos y se muestran las fechas en todo
        el sistema. Afecta, por ejemplo, cuándo una no conformidad pasa a estar
        vencida.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select
          id="zona"
          name="zona"
          value={seleccion}
          onChange={(e) => setSeleccion(e.target.value)}
          className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          {ZONAS_HORARIAS.map((z) => (
            <option key={z.id} value={z.id}>
              {z.label}
            </option>
          ))}
        </select>
        <SubmitButton cambiado={cambiado} />
      </div>

      {estado && !estado.ok && (
        <p className="mt-3 text-sm text-destructive">{estado.error}</p>
      )}
      {guardadoOk && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600">
          <Check className="h-4 w-4" aria-hidden="true" />
          Zona horaria actualizada.
        </p>
      )}
    </form>
  );
}
