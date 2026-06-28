// Utilidades de fecha ancladas a la zona horaria del sistema.
//
// El problema que resuelven: comparar `new Date(fechaLimite) < new Date()`
// usa el reloj del server (UTC en el contenedor de Vercel), no la zona del
// usuario. Una fecha límite "2026-06-28" (sin hora) se interpreta como
// medianoche UTC, que en Argentina (UTC-3) es las 21:00 del día anterior:
// el sistema podía marcar "Vencida" una NC que todavía no venció localmente.
//
// La solución: comparar el DÍA calendario en la zona del sistema, no el
// instante UTC. Usamos Intl.DateTimeFormat (nativo en Node, sin dependencias).

/**
 * Devuelve el día calendario (YYYY-MM-DD) de un instante, visto desde una
 * zona horaria IANA. Si no se pasa fecha, usa el "ahora" del server.
 */
function diaEnZona(zona: string, fecha: Date = new Date()): string {
  // en-CA produce el formato YYYY-MM-DD directamente.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(fecha);
}

/**
 * Normaliza una fecha límite (string de la base, con o sin hora) a su día
 * calendario YYYY-MM-DD. Las fechas tipo "date" de Postgres llegan como
 * "2026-06-28"; las timestamptz como ISO completo. Tomamos solo el día.
 */
function diaLimite(fechaLimite: string, zona: string): string {
  // Si ya viene como YYYY-MM-DD puro (campo date), usar tal cual: es un día
  // calendario sin instante, no hay que reinterpretarlo en ninguna zona.
  if (/^\d{4}-\d{2}-\d{2}$/.test(fechaLimite)) return fechaLimite;
  // Si trae hora (timestamptz), proyectarla a la zona del sistema.
  return diaEnZona(zona, new Date(fechaLimite));
}

/**
 * ¿Está vencida una fecha límite, según la zona del sistema?
 *
 * Vencida = el día límite es ANTERIOR al día de hoy en la zona. El día del
 * vencimiento en sí NO se considera vencido (tenés todo ese día para cerrar).
 *
 * @param fechaLimite  fecha límite cruda desde la base (puede ser null)
 * @param zona         zona horaria IANA del sistema
 * @param estaCerrado  si el ítem ya está cerrado, nunca está vencido
 */
export function estaVencida(
  fechaLimite: string | null,
  zona: string,
  estaCerrado: boolean,
): boolean {
  if (!fechaLimite || estaCerrado) return false;
  const hoy = diaEnZona(zona);
  const limite = diaLimite(fechaLimite, zona);
  // Comparación lexicográfica de YYYY-MM-DD equivale a comparación cronológica.
  return limite < hoy;
}

/**
 * Formatea una fecha para mostrar (día y mes abreviado) en es-AR y en la
 * zona del sistema. Para fechas date-only evita el corrimiento de día.
 */
export function formatearFechaCorta(fecha: string | null, zona: string): string {
  if (!fecha) return "—";
  const esDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  // Para date-only, fijar mediodía UTC evita que la conversión de zona
  // empuje la fecha al día anterior.
  const d = esDateOnly ? new Date(`${fecha}T12:00:00Z`) : new Date(fecha);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: zona,
    day: "numeric",
    month: "short",
  }).format(d);
}

/**
 * Igual que formatearFechaCorta pero en formato largo: "28 de junio de 2026".
 * Para títulos y detalles donde el contexto pide la fecha completa.
 */
export function formatearFechaLarga(fecha: string | null, zona: string): string {
  if (!fecha) return "—";
  const esDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(fecha);
  const d = esDateOnly ? new Date(`${fecha}T12:00:00Z`) : new Date(fecha);
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: zona,
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
