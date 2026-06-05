"use client";

import { useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { guardarAnalisisCausa, type EstadoAnalisis } from "@/app/(app)/ncs/[id]/actions";
import { Button } from "@/components/ui/button";

type Props = {
  ncId: string;
  metodoActual: string | null;
  analisisActual: string | null;
};

const METODOS = [
  { value: "cinco_porques", label: "Cinco porqués" },
  { value: "ishikawa", label: "Ishikawa (espina de pescado)" },
  { value: "pareto", label: "Pareto" },
  { value: "arbol_fallas", label: "Árbol de fallas" },
  { value: "otro", label: "Otro" },
];

function SubmitButton({ tieneAnalisis }: { tieneAnalisis: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Guardando…</>
      ) : (
        <><Save className="h-4 w-4" aria-hidden="true" />{tieneAnalisis ? "Actualizar análisis" : "Guardar análisis"}</>
      )}
    </Button>
  );
}

export function AnalisisCausaForm({ ncId, metodoActual, analisisActual }: Props) {
  const router = useRouter();
  const [estado, formAction] = useFormState<EstadoAnalisis, FormData>(
    guardarAnalisisCausa,
    null,
  );

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="ncId" value={ncId} />

      <div className="space-y-2">
        <label htmlFor="metodoAnalisis" className="text-sm font-medium">Método de análisis</label>
        <select
          id="metodoAnalisis" name="metodoAnalisis" defaultValue={metodoActual ?? ""}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-72"
        >
          <option value="" disabled>Elegí un método…</option>
          {METODOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="analisisCausaRaiz" className="text-sm font-medium">Análisis de causa raíz</label>
        <textarea
          id="analisisCausaRaiz" name="analisisCausaRaiz" rows={6} required
          defaultValue={analisisActual ?? ""}
          placeholder="Desarrollá el análisis: por qué ocurrió, causa raíz identificada, factores contribuyentes…"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {estado && !estado.ok && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {estado.error}
        </div>
      )}
      {estado?.ok && (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700">
          Análisis guardado.
        </div>
      )}

      <SubmitButton tieneAnalisis={!!analisisActual} />
    </form>
  );
}
