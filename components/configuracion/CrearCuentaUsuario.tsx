"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, UserPlus, Copy, Check, Mail, Link2 } from "lucide-react";
import { crearCuentaUsuario, type EstadoUsuario } from "@/app/(app)/configuracion/personas/[id]/usuario-actions";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";

type Props = {
  personaId: string;
  nombreCompleto: string;
  emailSugerido: string | null;
  usernameSugerido: string;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? <><Loader2 className="h-4 w-4 animate-spin" />Invitando…</> : <><UserPlus className="h-4 w-4" />Invitar usuario</>}
    </Button>
  );
}

export function CrearCuentaUsuario({ personaId, nombreCompleto, emailSugerido, usernameSugerido }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [estado, formAction] = useFormState<EstadoUsuario, FormData>(crearCuentaUsuario, null);

  useEffect(() => {
    if (estado?.ok) router.refresh();
  }, [estado, router]);

  function copiarEnlace() {
    if (estado?.ok && estado.enlaceInvitacion) {
      navigator.clipboard.writeText(estado.enlaceInvitacion);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setAbierto(true)}>
        <KeyRound className="h-3.5 w-3.5" />Crear cuenta de usuario
      </Button>

      <ModalShell abierto={abierto} onClose={() => setAbierto(false)} maxWidth="max-w-md">
        <ModalHeader>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Invitar usuario</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Para <span className="font-medium text-foreground">{nombreCompleto}</span>. Se le enviará un email
            para que defina su propia contraseña. Vos no manejás su clave.
          </p>
        </ModalHeader>
        {estado?.ok ? (
          <ModalBody>
              <div className="space-y-4 pb-3">
                  <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{estado.mensaje} Se envió a <span className="font-mono">{estado.email}</span>.</span>
                  </div>

                  {estado.enlaceInvitacion && (
                    <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3">
                      <div className="flex items-center gap-1.5 text-sm font-medium">
                        <Link2 className="h-4 w-4" />Enlace de respaldo
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Si el email no llega (por ejemplo, si el envío de correos aún no está configurado),
                        pasale este enlace a la persona para que defina su contraseña:
                      </p>
                      <div className="flex gap-2">
                        <input readOnly value={estado.enlaceInvitacion} className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs outline-none" />
                        <button type="button" onClick={copiarEnlace} className="rounded-md border border-border px-2 text-muted-foreground hover:text-foreground" title="Copiar">
                          {copiado ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <Button type="button" onClick={() => setAbierto(false)} className="w-full">Listo</Button>
              </div>
          </ModalBody>
        ) : (
          <form action={formAction} className={MODAL_FORM_CLASS}>
            <ModalBody className="space-y-4 pb-3">
                  <input type="hidden" name="personaId" value={personaId} />
                  <div className="space-y-2">
                    <label htmlFor="username" className="text-sm font-medium">Nombre de usuario</label>
                    <input id="username" name="username" required defaultValue={usernameSugerido}
                      onInput={(e) => { const el = e.currentTarget; el.value = el.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""); }}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <p className="text-xs text-muted-foreground">Minúsculas, números, punto, guion. Entre 3 y 50 caracteres.</p>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="email-cuenta" className="text-sm font-medium">Email de la persona</label>
                    <input id="email-cuenta" name="email" type="email" required defaultValue={emailSugerido ?? ""}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
                    <p className="text-xs text-muted-foreground">A esta dirección le llega la invitación para definir su contraseña.</p>
                  </div>
            </ModalBody>
            <ModalFooter>
              <ModalError mensaje={estado && !estado.ok ? estado.error : null} />
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={() => setAbierto(false)} className="flex-1">Cancelar</Button>
                <SubmitButton />
              </div>
            </ModalFooter>
          </form>
        )}
      </ModalShell>
    </>
  );
}
