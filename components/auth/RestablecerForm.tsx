"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, CheckCircle2, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Define la nueva contraseña. Cuando el usuario llega desde el mail de
 * recuperación, Supabase ya estableció una sesión temporal de tipo "recovery",
 * así que updateUser({ password }) actualiza la contraseña del usuario logueado.
 */
export function RestablecerForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [listo, setListo] = useState(false);
  const [sesionValida, setSesionValida] = useState<boolean | null>(null);

  // Verificar que haya una sesión de recuperación activa.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then((res) => {
      setSesionValida(!!res.data.session);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error: errUpd } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (errUpd) {
      setError(errUpd.message);
      return;
    }

    setListo(true);
    // Pequeña pausa para que vea el mensaje y luego al login.
    setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 2000);
  }

  if (listo) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-6 text-center">
        <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
        <div>
          <p className="font-medium text-foreground">Contraseña actualizada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ya podés ingresar con tu contraseña nueva. Te llevamos al inicio de
            sesión…
          </p>
        </div>
      </div>
    );
  }

  // Esperando verificar la sesión.
  if (sesionValida === null) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  // Sin sesión de recuperación (enlace vencido, ya usado, o entró directo).
  if (!sesionValida) {
    return (
      <div className="space-y-5">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
          <p className="font-medium">El enlace no es válido o ya venció</p>
          <p className="mt-1">
            Los enlaces de recuperación duran poco tiempo y se usan una sola vez.
            Pedí uno nuevo desde la pantalla de recuperación.
          </p>
        </div>
        <Link
          href="/recuperar"
          className="flex items-center justify-center gap-1.5 text-sm font-medium text-primary transition-colors hover:underline"
        >
          Pedir un nuevo enlace
        </Link>
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
        Elegí una contraseña nueva. Mínimo 8 caracteres.
      </p>

      <div className="space-y-2">
        <Label htmlFor="password">Contraseña nueva</Label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="pl-9"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password2">Repetir contraseña</Label>
        <div className="relative">
          <Lock
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="password2"
            type="password"
            required
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
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
            Guardando…
          </>
        ) : (
          "Guardar contraseña nueva"
        )}
      </Button>
    </form>
  );
}
