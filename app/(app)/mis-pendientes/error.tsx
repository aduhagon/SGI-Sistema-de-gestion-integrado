"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ErrorPendientes({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  useEffect(() => { console.error("[SGI:pendientes] Bandeja incompleta", error); }, [error]);
  return <section role="alert" className="mx-auto max-w-3xl space-y-4 p-6 sm:p-10">
    <h1 className="font-serif text-2xl font-semibold">No pudimos cargar todos tus pendientes</h1>
    <p className="text-sm text-muted-foreground">Una consulta no se completó. No podemos confirmar que no tengas tareas pendientes. Tus tareas y los cambios guardados se conservan.</p>
    <button type="button" onClick={() => { router.refresh(); reset(); }} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Volver a consultar</button>
    <p className="text-xs text-muted-foreground">Si continúa, avisá al administrador del SGI.{error.digest ? ` Referencia: ${error.digest}` : ""}</p>
  </section>;
}
