"use client";

import { useEffect } from "react";

/**
 * Inicializa Sentry en el navegador (errores no capturados y promesas
 * rechazadas del lado del cliente). Es un no-op si NEXT_PUBLIC_SENTRY_DSN
 * no está configurada en Vercel, así el deploy nunca depende de Sentry.
 */
export default function SentryInit() {
  useEffect(() => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (!dsn) return;

    import("@sentry/nextjs").then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
        // Solo errores; sin tracing ni replay para no sumar peso al bundle
        // ni consumir cuota del plan gratuito.
        tracesSampleRate: 0,
      });
    });
  }, []);

  return null;
}
