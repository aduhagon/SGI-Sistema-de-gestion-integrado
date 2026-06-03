import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
      <aside className="relative hidden lg:flex flex-col justify-between p-12 bg-foreground text-background overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="relative z-10">
          <div className="flex items-baseline gap-3">
            <span className="font-serif text-4xl font-semibold tracking-tight">MSU</span>
            <span className="text-sm uppercase tracking-[0.2em] text-background/60">
              Agroindustria
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <p className="font-serif text-4xl leading-tight">
            Sistema de Gestión Documental
            <span className="text-accent"> Multinorma</span>
          </p>
          <p className="text-base text-background/70 leading-relaxed">
            Una sola fuente de verdad para la documentación de los Sistemas de
            Gestión Integrado. ISO 9001, 14001, 45001, BRCGS, GlobalGAP y BPA en
            un mismo lugar, con trazabilidad completa y auditabilidad por diseño.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs uppercase tracking-wider text-background/40">
          <span>Versión 1.0 — Mayo 2026</span>
          <span>Uso interno</span>
        </div>
      </aside>

      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="lg:hidden flex items-baseline gap-3">
            <span className="font-serif text-3xl font-semibold tracking-tight text-primary">
              MSU
            </span>
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              SGI Multinorma
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              Iniciar sesión
            </h1>
            <p className="text-sm text-muted-foreground">
              Ingresá con tu cuenta del SGI para continuar.
            </p>
          </div>

          <Suspense fallback={<div className="h-72" />}>
            <LoginForm />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
