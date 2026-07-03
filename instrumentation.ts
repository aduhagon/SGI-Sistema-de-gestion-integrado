/**
 * Hook de instrumentación de Next.js (requiere experimental.instrumentationHook).
 * Inicializa Sentry en el runtime del servidor y del edge.
 *
 * Si NEXT_PUBLIC_SENTRY_DSN no está definida, no hace nada: el deploy es
 * seguro aunque todavía no exista la cuenta de Sentry.
 */
export async function register() {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.VERCEL_ENV ?? "development",
    // Solo errores; sin tracing para no sumar overhead ni consumir cuota.
    tracesSampleRate: 0,
  });
}
