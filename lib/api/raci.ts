import { createClient } from "@/lib/supabase/server";

export type RaciValor = "A" | "R" | "C" | "I" | null;

export type MatrizRaci = {
  // Filas: puestos (orden estable por nombre).
  puestos: string[];
  // Columnas: ejes (procesos o documentos), con código + nombre/título.
  columnas: { codigo: string; etiqueta: string }[];
  // celdas[puesto][codigoColumna] = "A" | "R" | "I" ...
  celdas: Record<string, Record<string, RaciValor>>;
};

// ── Puesto × Proceso ────────────────────────────────────────────────────────
export async function obtenerRaciPuestoProceso(): Promise<MatrizRaci> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_raci_puesto_proceso");
  if (error || !data) return { puestos: [], columnas: [], celdas: {} };
  return armarMatriz(
    data as Array<{ puesto: string; proceso_codigo: string; proceso_nombre: string; raci: string }>,
    (r) => r.proceso_codigo,
    (r) => r.proceso_nombre,
  );
}

// ── Puesto × Documento ──────────────────────────────────────────────────────
export async function obtenerRaciPuestoDocumento(): Promise<MatrizRaci> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("fn_raci_puesto_documento");
  if (error || !data) return { puestos: [], columnas: [], celdas: {} };
  return armarMatriz(
    data as Array<{ puesto: string; documento_codigo: string; documento_titulo: string; raci: string }>,
    (r) => r.documento_codigo,
    (r) => r.documento_titulo,
  );
}

// Normaliza filas planas {puesto, codigo, etiqueta, raci} en una matriz.
function armarMatriz<T extends { puesto: string; raci: string }>(
  filas: T[],
  getCodigo: (r: T) => string,
  getEtiqueta: (r: T) => string,
): MatrizRaci {
  const puestosSet = new Set<string>();
  const colsMap = new Map<string, string>();
  const celdas: Record<string, Record<string, RaciValor>> = {};

  for (const f of filas) {
    const cod = getCodigo(f);
    puestosSet.add(f.puesto);
    if (!colsMap.has(cod)) colsMap.set(cod, getEtiqueta(f));
    (celdas[f.puesto] ??= {})[cod] = (f.raci as RaciValor) ?? null;
  }

  const puestos = Array.from(puestosSet).sort((a, b) => a.localeCompare(b, "es"));
  const columnas = Array.from(colsMap.entries())
    .map(([codigo, etiqueta]) => ({ codigo, etiqueta }))
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es"));

  return { puestos, columnas, celdas };
}
