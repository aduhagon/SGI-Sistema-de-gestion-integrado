"use client";

import { useState } from "react";

/**
 * Selector encadenado Norma → Requisito para el alta de no conformidad.
 *
 * Reutiliza el patrón de datos de las coberturas:
 *   - `normas`: salida de obtenerNormasConRequisitos() (lib/api/matriz)
 *   - `requisitosPorNorma`: mapa versionNormaId -> RequisitoOpcion[]
 *     (se arma en la page con obtenerRequisitosDeNorma)
 *
 * Emite un único campo de formulario: <input name="requisitoId">, con el id del
 * requisito elegido. La norma es solo para filtrar; no se envía (la NC guarda
 * el requisito, y la norma se deduce del requisito).
 *
 * Pensado para requisito OBLIGATORIO: el segundo select tiene `required`.
 */

export type NormaOpcionNC = {
  versionNormaId: string;
  codigo: string;
  nombreCorto: string;
  version: string;
};

export type RequisitoOpcionNC = {
  id: string;
  clausula: string;
  titulo: string;
};

type Props = {
  normas: NormaOpcionNC[];
  requisitosPorNorma: Record<string, RequisitoOpcionNC[]>;
  /** Valores iniciales opcionales (para reusar en edición a futuro). */
  normaInicial?: string;
  requisitoInicial?: string;
};

export function SelectorRequisitoNC({
  normas,
  requisitosPorNorma,
  normaInicial,
  requisitoInicial,
}: Props) {
  const [normaSel, setNormaSel] = useState(normaInicial ?? "");
  const [requisitoSel, setRequisitoSel] = useState(requisitoInicial ?? "");

  const requisitos = normaSel ? requisitosPorNorma[normaSel] ?? [] : [];

  // Caso sin datos: no hay ninguna norma con requisitos cargados.
  if (normas.length === 0) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium">Requisito incumplido</label>
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          No hay normas con requisitos cargados todavía. Cargá los requisitos de
          al menos una norma (en Configuración → Normas) para poder vincular la no
          conformidad a un requisito.
        </p>
        {/* Campo vacío para que el form no rompa si el server lo espera. */}
        <input type="hidden" name="requisitoId" value="" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor="normaRefNC" className="text-sm font-medium">
          Norma
        </label>
        <select
          id="normaRefNC"
          value={normaSel}
          onChange={(e) => {
            setNormaSel(e.target.value);
            setRequisitoSel(""); // al cambiar de norma, reseteamos el requisito
          }}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Elegí una norma…</option>
          {normas.map((n) => (
            <option key={n.versionNormaId} value={n.versionNormaId}>
              {n.codigo} · {n.nombreCorto} ({n.version})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="requisitoId" className="text-sm font-medium">
          Requisito incumplido
        </label>
        <select
          id="requisitoId"
          name="requisitoId"
          required
          value={requisitoSel}
          onChange={(e) => setRequisitoSel(e.target.value)}
          disabled={!normaSel}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        >
          <option value="">
            {normaSel ? "Elegí el requisito…" : "Elegí una norma primero"}
          </option>
          {requisitos.map((r) => (
            <option key={r.id} value={r.id}>
              {r.clausula} — {r.titulo}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
