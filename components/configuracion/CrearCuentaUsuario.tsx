"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, UserPlus, Copy, Check, RefreshCw } from "lucide-react";
import { crearCuentaUsuario, type EstadoUsuario } from "@/app/(app)/configuracion/personas/[id]/usuario-actions";
import { Button } from "@/components/ui/button";

type Props = {
  personaId: string;
  nombreCompleto: string;
  emailSugerido: string | null;
  usernameSugerido: string;
};

function genPassword(): string {
  // Contraseña temporal legible: 3 letras + 4 dígitos + símbolo.
  const letras = "abcdefghijkmnpqrstuvwxyz";
  const May = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const nums = "23456789";
  const sym = "@#$%&*";
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  return (
    pick(May) + pick(letras) + pick(letras) +
    pick(nums) + pick(nums) + pick(nums) + pick(nums) +
    pick(sym)
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Creando…</> : <><UserPlus className="h-4 w-4" />Crear cuenta</>}
    </Button>
  );
}

export function CrearCuentaUsuario({ personaId, nombreCompleto, emailSugerido, usernameSugerido }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [password, setPassword] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [estado, formAction] = useFormState<EstadoUsuario, FormData>(crearCuentaUsuario, null);

  useEffect(() => {
    if (abierto && !password) setPassword(genPassword());
  }, [abierto, password]);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  function copiar() {
    navigator.clipboard.writeText(password);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
        <KeyRound className="h-3.5 w-3.5" />Crear cuenta de usuario
      </Button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setAbierto(false)} />
          <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">Crear cuenta de usuario</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Para <span className="font-medium text-foreground">{nombreCompleto}</span>. Se crea con una
                contraseña temporal que la persona debería cambiar en su primer ingreso.
              </p>

              {estado?.ok ? (
                <div className="mt-6 space-y-4">
                  <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{estado.mensaje}</span>
                  </div>
                  <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
                    <p className="mb-1 font-medium">Credenciales para entregar:</p>
                    <p className="text-muted-foreground">Email: <span className="font-mono text-foreground">{(document.getElementById("email-cuenta") as HTMLInputElement)?.value}</span></p>
                    <p className="text-muted-foreground">Contraseña temporal: <span className="font-mono text-foreground">{password}</span></p>
                  </div>
                  <p className="text-xs text-muted-foreground">Guardá estos datos ahora: la contraseña no se vuelve a mostrar.</p>
                  <Button type="button" onClick={() => { setAbierto(false); setPassword(""); }} className="w-full">Listo</Button>
                </div>
              ) : (
                <form action={formAction} className="mt-6 space-y-4">
                  <input type="hidden" name="personaId" value={personaId} />
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">Nombre de usuario</label>
                    <input id="username" name="username" required defaultValue={usernameSugerido}
                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""); }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <p className="text-xs text-muted-foreground">Minúsculas, números, punto, guion. Entre 3 y 50 caracteres.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email-cuenta" className="text-sm font-medium">Email de acceso</label>
                    <input id="email-cuenta" name="email" type="email" required defaultValue={emailSugerido ?? ""}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">Contraseña temporal</label>
                    <div className="flex gap-2">
                      <input id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                      <button type="button" onClick={() => setPassword(genPassword())} className="rounded-md border border-border px-2 text-muted-foreground hover:text-foreground" title="Generar otra">
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button type="button" onClick={copiar} className="rounded-md border border-border px-2 text-muted-foreground hover:text-foreground" title="Copiar">
                        {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  {estado && !estado.ok && (
                    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{estado.error}</div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                    <SubmitButton />
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
