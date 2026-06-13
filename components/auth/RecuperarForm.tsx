"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Pide el envío del mail de recuperación. Usa resetPasswordForEmail de Supabase,
 * con redirectTo apuntando a /restablecer (donde el usuario define la nueva
 * contraseña al volver desde el mail).
 *
 * IMPORTANTE: la URL de redirect debe estar permitida en Supabase
 * (Authentication → URL Configuration → Redirect URLs). Ver instructivo.
 */
export function RecuperarForm() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/restablecer`;

    const { error: errReset } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (errReset) {
      setError(errReset.message);
      return;
    }

    // Siempre mostramos éxito, exista o no el email (no revelar qué emails
    // están registrados, por seguridad).
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Revisá tu correo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Si <span className="font-medium">{email}</span> está registrado, te
              enviamos un enlace para restablecer tu contraseña. El enlace vence en
              poco tiempo, así que usalo pronto.
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Ingresá tu email corporativo y te enviaremos un enlace para crear una
        contraseña nueva.
      </p>

      <div className="space-y-2">
        <Label htmlFor="email">Email corporativo</Label>
        <div className="relative">
          <Mail
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="email"
            type="email"
            placeholder="nombre@msu.com"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Enviando…
          </>
        ) : (
          "Enviar enlace de recuperación"
        )}
      </Button>

      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Volver al inicio de sesión
      </Link>
    </form>
  );
}
