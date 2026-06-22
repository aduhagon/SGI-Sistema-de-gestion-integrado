"use client";

import { useMemo, useState } from "react";
import { Search, ArrowUpDown, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ParticipacionGlobal } from "@/lib/api/participaciones";

type Props = {
  filas: ParticipacionGlobal[];
};

const ROL_ETIQUETA: Record<string, string> = {
  responsable_proceso: "Responsable del proceso",
  elaborador: "Elaborador",
  aprobador_n1: "Aprobador N1",
  aprobador_n2: "Aprobador N2",
  lector: "Lector",
};

const BANDA_ETIQUETA: Record<string, string> = {
  estrategico: "Estratégico",
  operativo: "Operativo",
  apoyo: "Apoyo",
};

type Columna = "persona" | "proceso" | "rol";
const POR_PAGINA = 50;

const selectClass =
  "rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ParticipacionGrid({ filas }: Props) {
  const [busqueda, setBusqueda] = useState("");
  const [fProceso, setFProceso] = useState("");
  const [fRol, setFRol] = useState("");
  const [orden, setOrden] = useState<Columna>("persona");
  const [asc, setAsc] = useState(true);
  const [pagina, setPagina] = useState(1);

  // Opciones de filtro derivadas de los datos.
  const procesos = useMemo(
    () =>
      Array.from(new Set(filas.map((f) => f.procesoNombre)))
        .sort((a, b) => a.localeCompare(b)),
    [filas],
  );
  const roles = useMemo(
    () =>
      Array.from(new Set(filas.map((f) => f.rol)))
        .sort((a, b) => (ROL_ETIQUETA[a] ?? a).localeCompare(ROL_ETIQUETA[b] ?? b)),
    [filas],
  );

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const arr = filas.filter((f) => {
      if (fProceso && f.procesoNombre !== fProceso) return false;
      if (fRol && f.rol !== fRol) return false;
      if (q) {
        const hay = `${f.usuarioNombre} ${f.procesoNombre} ${ROL_ETIQUETA[f.rol] ?? f.rol}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const dir = asc ? 1 : -1;
    arr.sort((a, b) => {
      const va =
        orden === "persona" ? a.usuarioNombre
        : orden === "proceso" ? a.procesoNombre
        : ROL_ETIQUETA[a.rol] ?? a.rol;
      const vb =
        orden === "persona" ? b.usuarioNombre
        : orden === "proceso" ? b.procesoNombre
        : ROL_ETIQUETA[b.rol] ?? b.rol;
      return va.localeCompare(vb) * dir;
    });
    return arr;
  }, [filas, busqueda, fProceso, fRol, orden, asc]);

  // Paginación (client-side).
  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = filtradas.slice((paginaSegura - 1) * POR_PAGINA, paginaSegura * POR_PAGINA);

  function ordenarPor(col: Columna) {
    if (orden === col) {
      setAsc((v) => !v);
    } else {
      setOrden(col);
      setAsc(true);
    }
    setPagina(1);
  }

  function Th({ col, children }: { col: Columna; children: React.ReactNode }) {
    return (
      <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">
        <button
          type="button"
          onClick={() => ordenarPor(col)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
        >
          {children}
          <ArrowUpDown className={`h-3 w-3 ${orden === col ? "text-foreground" : "opacity-40"}`} />
        </button>
      </th>
    );
  }

  return (
    <div>
      {/* Controles */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
            placeholder="Buscar persona, proceso o rol…"
            className="pl-9"
          />
        </div>
        <select
          value={fProceso}
          onChange={(e) => { setFProceso(e.target.value); setPagina(1); }}
          className={selectClass}
          aria-label="Filtrar por proceso"
        >
          <option value="">Todos los procesos</option>
          {procesos.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select
          value={fRol}
          onChange={(e) => { setFRol(e.target.value); setPagina(1); }}
          className={selectClass}
          aria-label="Filtrar por rol"
        >
          <option value="">Todos los roles</option>
          {roles.map((r) => <option key={r} value={r}>{ROL_ETIQUETA[r] ?? r}</option>)}
        </select>
      </div>

      {/* Conteo */}
      <p className="mb-2 text-xs text-muted-foreground">
        {filtradas.length} {filtradas.length === 1 ? "participación" : "participaciones"}
        {(busqueda || fProceso || fRol) && ` (de ${filas.length})`}
      </p>

      {filtradas.length > 0 ? (
        <>
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <Th col="persona">Persona</Th>
                  <Th col="proceso">Proceso</Th>
                  <Th col="rol">Rol</Th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => (
                  <tr key={f.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium">{f.usuarioNombre}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
                        {f.procesoNombre}
                        {f.procesoTipo && (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                            {BANDA_ETIQUETA[f.procesoTipo] ?? f.procesoTipo}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{ROL_ETIQUETA[f.rol] ?? f.rol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPaginas > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Página {paginaSegura} de {totalPaginas}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={paginaSegura <= 1}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
                  disabled={paginaSegura >= totalPaginas}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-muted disabled:opacity-40"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
          <Users className="mb-3 h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {filas.length === 0 ? "No hay participaciones vigentes" : "Sin resultados para el filtro"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {filas.length === 0
              ? "Cuando asignes personas a puestos con roles en procesos, aparecerán acá."
              : "Probá ajustar la búsqueda o los filtros."}
          </p>
        </div>
      )}
    </div>
  );
}
