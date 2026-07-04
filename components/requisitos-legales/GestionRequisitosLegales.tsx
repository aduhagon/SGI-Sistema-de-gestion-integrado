"use client";

import { useState, useEffect } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Scale,
  ClipboardCheck,
  Download,
  LayoutList,
  FolderTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell, ModalHeader, ModalBody, ModalFooter, ModalError, MODAL_FORM_CLASS } from "@/components/ui/modal";
import {
  guardarRequisitoLegal,
  eliminarRequisitoLegal,
  registrarEvaluacion,
  type EstadoReqLegal,
} from "@/app/(app)/requisitos-legales/actions";
import {
  TIPOS_REQUISITO_LEGAL,
  ESTADOS_CUMPLIMIENTO,
  CRITICIDADES,
  ETIQUETA_TIPO,
  ETIQUETA_CUMPLIMIENTO,
} from "@/lib/schemas/requisito-legal";
import type { RequisitoLegal } from "@/lib/api/requisitos-legales";

type Selector = { id: string; codigo?: string; nombre: string };

type Props = {
  requisitos: RequisitoLegal[];
  procesos: Selector[];
  normas: Selector[];
  codigoSugerido: string | null;
};

const COLOR_ESTADO: Record<string, string> = {
  cumple: "bg-emerald-100 text-emerald-700",
  cumple_parcial: "bg-amber-100 text-amber-700",
  no_cumple: "bg-rose-100 text-rose-700",
  no_aplica: "bg-muted text-muted-foreground",
  pendiente_evaluacion: "bg-blue-100 text-blue-700",
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="flex-1">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Guardando…
        </>
      ) : (
        label
      )}
    </Button>
  );
}

export function GestionRequisitosLegales({
  requisitos,
  procesos,
  normas,
  codigoSugerido,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<RequisitoLegal | null>(null);
  const [evaluando, setEvaluando] = useState<RequisitoLegal | null>(null);
  const [eliminando, setEliminando] = useState<string | null>(null);
  const [borrarDe, setBorrarDe] = useState<RequisitoLegal | null>(null);
  const [motivo, setMotivo] = useState("");
  const [procesosSel, setProcesosSel] = useState<string[]>([]);
  const [normasSel, setNormasSel] = useState<string[]>([]);
  const [filtroNorma, setFiltroNorma] = useState<string>("__todas__");
  const [vista, setVista] = useState<"lista" | "proceso">("lista");

  const [estadoForm, accionForm] = useFormState<EstadoReqLegal, FormData>(
    guardarRequisitoLegal,
    null,
  );
  const [estadoEval, accionEval] = useFormState<EstadoReqLegal, FormData>(
    registrarEvaluacion,
    null,
  );

  // Cerrar diálogos al guardar con éxito.
  useEffect(() => {
    if (estadoForm?.ok) {
      setAbierto(false);
      setEditando(null);
      setProcesosSel([]);
      setNormasSel([]);
    }
  }, [estadoForm]);
  useEffect(() => {
    if (estadoEval?.ok) setEvaluando(null);
  }, [estadoEval]);

  function abrirNuevo() {
    setEditando(null);
    setProcesosSel([]);
    setNormasSel([]);
    setAbierto(true);
  }
  function abrirEdicion(r: RequisitoLegal) {
    setEditando(r);
    setProcesosSel(r.procesos.map((p) => p.id));
    setNormasSel(r.normas.map((n) => n.id));
    setAbierto(true);
  }

  function toggleProceso(id: string) {
    setProcesosSel((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  function toggleNorma(id: string) {
    setNormasSel((prev) =>
      prev.includes(id) ? prev.filter((n) => n !== id) : [...prev, id],
    );
  }

  // Filtro por norma (en cliente). "__todas__" = sin filtro; "__sin__" = sin norma.
  const requisitosFiltrados =
    filtroNorma === "__todas__"
      ? requisitos
      : filtroNorma === "__sin__"
        ? requisitos.filter((r) => r.normas.length === 0)
        : requisitos.filter((r) => r.normas.some((n) => n.id === filtroNorma));

  // URL de descarga del Excel, respetando el filtro de norma activo.
  const urlExport =
    filtroNorma === "__todas__"
      ? "/requisitos-legales/export"
      : `/requisitos-legales/export?norma=${encodeURIComponent(filtroNorma)}`;

  // Agrupación por proceso (un requisito puede caer en varios procesos).
  const grupos = procesos
    .map((p) => ({
      proceso: p,
      items: requisitosFiltrados.filter((r) =>
        r.procesos.some((rp) => rp.id === p.id),
      ),
    }))
    .filter((g) => g.items.length > 0);
  const sinProceso = requisitosFiltrados.filter((r) => r.procesos.length === 0);

  function filaRequisito(r: RequisitoLegal, mostrarProcesos: boolean) {
    return (
      <tr key={r.id} className="border-b border-border last:border-0">
        <td className="px-4 py-2.5">
          <div className="flex items-start gap-2">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <div className="font-medium">
                <span className="font-mono text-xs text-muted-foreground">
                  {r.codigo}
                </span>{" "}
                {r.titulo}
              </div>
              {r.referencia && (
                <div className="text-xs text-muted-foreground">{r.referencia}</div>
              )}
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">
          {ETIQUETA_TIPO[r.tipo as keyof typeof ETIQUETA_TIPO] ?? r.tipo}
        </td>
        <td className="px-4 py-2.5 hidden md:table-cell">
          {r.normas.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {r.normas.map((n) => (
                <span
                  key={n.id}
                  className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                >
                  {n.nombre}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground/50">—</span>
          )}
        </td>
        {mostrarProcesos && (
          <td className="px-4 py-2.5 text-muted-foreground hidden lg:table-cell">
            {r.procesos.length > 0 ? (
              <span className="text-xs">
                {r.procesos.map((p) => p.codigo).join(", ")}
              </span>
            ) : (
              <span className="text-muted-foreground/50">—</span>
            )}
          </td>
        )}
        <td className="px-4 py-2.5">
          {r.ultimoEstado ? (
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs ${COLOR_ESTADO[r.ultimoEstado] ?? "bg-muted"}`}
            >
              {ETIQUETA_CUMPLIMIENTO[r.ultimoEstado]}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/50">Sin evaluar</span>
          )}
        </td>
        <td className="px-4 py-2.5">
          <div className="flex justify-end gap-1">
            <button
              onClick={() => setEvaluando(r)}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Evaluar cumplimiento"
              aria-label="Evaluar cumplimiento"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => abrirEdicion(r)}
              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Editar"
              aria-label="Editar"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setBorrarDe(r)}
              disabled={eliminando === r.id}
              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
              title="Eliminar"
              aria-label="Eliminar"
            >
              {eliminando === r.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </td>
      </tr>
    );
  }

  function tablaRequisitos(items: RequisitoLegal[], mostrarProcesos: boolean) {
    return (
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left">
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Requisito</th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                Tipo
              </th>
              <th className="px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">
                Normas
              </th>
              {mostrarProcesos && (
                <th className="px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">
                  Procesos
                </th>
              )}
              <th className="px-4 py-2.5 font-medium text-muted-foreground">Cumplimiento</th>
              <th className="px-4 py-2.5 w-28"></th>
            </tr>
          </thead>
          <tbody>{items.map((r) => filaRequisito(r, mostrarProcesos))}</tbody>
        </table>
      </div>
    );
  }

  const vacio = (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12 text-center">
      <Scale className="mb-3 h-6 w-6 text-muted-foreground" />
      {requisitos.length === 0 ? (
        <>
          <p className="text-sm font-medium">No hay requisitos legales cargados</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Registrá las leyes, decretos, permisos y otros requisitos aplicables, y
            vinculalos a los procesos que afectan.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">
            Ningún requisito coincide con este filtro
          </p>
          <button
            type="button"
            onClick={() => setFiltroNorma("__todas__")}
            className="mt-2 text-xs text-primary underline-offset-2 hover:underline"
          >
            Ver todos
          </button>
        </>
      )}
    </div>
  );

  async function confirmarBorrado() {
    if (!borrarDe) return;
    setEliminando(borrarDe.id);
    const r = await eliminarRequisitoLegal(borrarDe.id, motivo);
    setEliminando(null);
    if (r?.ok) {
      setBorrarDe(null);
      setMotivo("");
    } else if (r && !r.ok) {
      alert(r.error);
    }
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {requisitosFiltrados.length} requisito
          {requisitosFiltrados.length === 1 ? "" : "s"}
          {filtroNorma !== "__todas__"
            ? ` (de ${requisitos.length})`
            : " registrado" + (requisitos.length === 1 ? "" : "s")}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle de vista */}
          <div className="flex rounded-md border border-border p-0.5">
            <button
              type="button"
              onClick={() => setVista("lista")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                vista === "lista"
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={vista === "lista"}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Lista
            </button>
            <button
              type="button"
              onClick={() => setVista("proceso")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                vista === "proceso"
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={vista === "proceso"}
            >
              <FolderTree className="h-3.5 w-3.5" />
              Por proceso
            </button>
          </div>

          {/* Exportar a Excel (respeta el filtro de norma activo) */}
          <a
            href={urlExport}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            title="Exportar a Excel lo que se ve"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar a Excel
          </a>

          <Button size="sm" onClick={abrirNuevo}>
            <Plus className="h-4 w-4" />
            Nuevo requisito
          </Button>
        </div>
      </div>

      {/* Filtro por norma */}
      {normas.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Norma:</span>
          {[
            { id: "__todas__", nombre: "Todas" },
            ...normas,
            { id: "__sin__", nombre: "Sin norma" },
          ].map((f) => {
            const activo = filtroNorma === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroNorma(f.id)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  activo
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.nombre}
              </button>
            );
          })}
        </div>
      )}

      {requisitosFiltrados.length === 0 ? (
        vacio
      ) : vista === "lista" ? (
        tablaRequisitos(requisitosFiltrados, true)
      ) : (
        <div className="space-y-6">
          {grupos.map((g) => (
            <div key={g.proceso.id}>
              <div className="mb-2 flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">
                  {g.proceso.codigo ? `${g.proceso.codigo} — ` : ""}
                  {g.proceso.nombre}
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({g.items.length})
                </span>
              </div>
              {tablaRequisitos(g.items, false)}
            </div>
          ))}
          {sinProceso.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-muted-foreground/50" />
                <h3 className="text-sm font-medium text-muted-foreground">
                  Sin proceso asignado
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({sinProceso.length})
                </span>
              </div>
              {tablaRequisitos(sinProceso, false)}
            </div>
          )}
        </div>
      )}

      {/* Diálogo alta/edición */}
      <ModalShell abierto={abierto} onClose={() => setAbierto(false)} maxWidth="max-w-lg">
        <ModalHeader>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">
            {editando ? "Editar requisito legal" : "Nuevo requisito legal"}
          </h2>
        </ModalHeader>
        <form action={accionForm} className={MODAL_FORM_CLASS}>
          <ModalBody className="space-y-4">
                {editando && <input type="hidden" name="id" value={editando.id} />}
                {procesosSel.map((p) => (
                  <input key={p} type="hidden" name="procesosIds" value={p} />
                ))}
                {normasSel.map((n) => (
                  <input key={n} type="hidden" name="normasIds" value={n} />
                ))}

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="codigo" className="text-sm font-medium">
                      Código
                    </label>
                    <input
                      id="codigo"
                      name="codigo"
                      required
                      defaultValue={editando?.codigo ?? codigoSugerido ?? ""}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label htmlFor="tipo" className="text-sm font-medium">
                      Tipo
                    </label>
                    <select
                      id="tipo"
                      name="tipo"
                      required
                      defaultValue={editando?.tipo ?? "ley"}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {TIPOS_REQUISITO_LEGAL.map((t) => (
                        <option key={t} value={t}>
                          {ETIQUETA_TIPO[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="titulo" className="text-sm font-medium">
                    Título
                  </label>
                  <input
                    id="titulo"
                    name="titulo"
                    required
                    defaultValue={editando?.titulo ?? ""}
                    placeholder="Ej: Ley de Residuos Peligrosos"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="referencia" className="text-sm font-medium">
                      Referencia{" "}
                      <span className="text-muted-foreground">(nº / artículo)</span>
                    </label>
                    <input
                      id="referencia"
                      name="referencia"
                      defaultValue={editando?.referencia ?? ""}
                      placeholder="Ej: Ley 24.051"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="jurisdiccion" className="text-sm font-medium">
                      Jurisdicción
                    </label>
                    <input
                      id="jurisdiccion"
                      name="jurisdiccion"
                      defaultValue={editando?.jurisdiccion ?? ""}
                      placeholder="Nacional / Provincial / Municipal"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="organismoEmisor" className="text-sm font-medium">
                      Organismo emisor
                    </label>
                    <input
                      id="organismoEmisor"
                      name="organismoEmisor"
                      defaultValue={editando?.organismoEmisor ?? ""}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="fechaVigenciaDesde" className="text-sm font-medium">
                      Vigente desde
                    </label>
                    <input
                      id="fechaVigenciaDesde"
                      name="fechaVigenciaDesde"
                      type="date"
                      defaultValue={editando?.fechaVigenciaDesde ?? ""}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                {/* Multi-select de normas (N:M) */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">
                    Normas a las que responde{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                  </span>
                  <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-2">
                    {normas.map((n) => {
                      const sel = normasSel.includes(n.id);
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => toggleNorma(n.id)}
                          className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                            sel
                              ? "bg-emerald-600 text-white"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          {n.nombre}
                        </button>
                      );
                    })}
                    {normas.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No hay normas cargadas.
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Un mismo requisito puede aplicar a varias normas.
                  </p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="criticidad" className="text-sm font-medium">
                    Criticidad{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <select
                    id="criticidad"
                    name="criticidad"
                    defaultValue={editando?.criticidad ?? ""}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Sin definir</option>
                    {CRITICIDADES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="urlFuente" className="text-sm font-medium">
                    URL de la fuente{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <input
                    id="urlFuente"
                    name="urlFuente"
                    type="url"
                    defaultValue={editando?.urlFuente ?? ""}
                    placeholder="https://…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="descripcion" className="text-sm font-medium">
                    Descripción{" "}
                    <span className="text-muted-foreground">(qué exige)</span>
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    rows={3}
                    defaultValue={editando?.descripcion ?? ""}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {/* Multi-select de procesos */}
                <div className="space-y-2">
                  <span className="text-sm font-medium">Procesos a los que aplica</span>
                  <div className="flex flex-wrap gap-2 rounded-md border border-input bg-background p-2">
                    {procesos.map((p) => {
                      const sel = procesosSel.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleProceso(p.id)}
                          className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                            sel
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground hover:bg-muted/70"
                          }`}
                        >
                          {p.codigo ? `${p.codigo} — ${p.nombre}` : p.nombre}
                        </button>
                      );
                    })}
                    {procesos.length === 0 && (
                      <span className="text-xs text-muted-foreground">
                        No hay procesos cargados.
                      </span>
                    )}
                  </div>
                </div>

                <div className="pb-1" />
          </ModalBody>
          <ModalFooter>
            <ModalError mensaje={estadoForm && !estadoForm.ok ? estadoForm.error : null} />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAbierto(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <SubmitButton label={editando ? "Guardar cambios" : "Crear requisito"} />
            </div>
          </ModalFooter>
        </form>
      </ModalShell>

      {/* Diálogo evaluación de cumplimiento */}
      {evaluando && (
        <ModalShell abierto onClose={() => setEvaluando(null)} maxWidth="max-w-md">
          <ModalHeader>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              Evaluar cumplimiento
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-mono text-xs">{evaluando.codigo}</span>{" "}
              {evaluando.titulo}
            </p>
          </ModalHeader>
          <form action={accionEval} className={MODAL_FORM_CLASS}>
            <ModalBody className="space-y-4">
                <input type="hidden" name="requisitoLegalId" value={evaluando.id} />

                <div className="space-y-2">
                  <label htmlFor="estado" className="text-sm font-medium">
                    Estado de cumplimiento
                  </label>
                  <select
                    id="estado"
                    name="estado"
                    required
                    defaultValue="cumple"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {ESTADOS_CUMPLIMIENTO.map((e) => (
                      <option key={e} value={e}>
                        {ETIQUETA_CUMPLIMIENTO[e]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="procesoId" className="text-sm font-medium">
                    Proceso{" "}
                    <span className="text-muted-foreground">(opcional, si es específico)</span>
                  </label>
                  <select
                    id="procesoId"
                    name="procesoId"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Evaluación general</option>
                    {evaluando.procesos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.codigo} — {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="fechaEvaluacion" className="text-sm font-medium">
                      Fecha
                    </label>
                    <input
                      id="fechaEvaluacion"
                      name="fechaEvaluacion"
                      type="date"
                      required
                      defaultValue={hoy}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="proximaEvaluacion" className="text-sm font-medium">
                      Próxima evaluación
                    </label>
                    <input
                      id="proximaEvaluacion"
                      name="proximaEvaluacion"
                      type="date"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="evidencia" className="text-sm font-medium">
                    Evidencia
                  </label>
                  <textarea
                    id="evidencia"
                    name="evidencia"
                    rows={3}
                    placeholder="Documento, certificado, registro que respalda el estado…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="observaciones" className="text-sm font-medium">
                    Observaciones{" "}
                    <span className="text-muted-foreground">(opcional)</span>
                  </label>
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <div className="pb-1" />
            </ModalBody>
            <ModalFooter>
              <ModalError mensaje={estadoEval && !estadoEval.ok ? estadoEval.error : null} />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEvaluando(null)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <SubmitButton label="Registrar evaluación" />
              </div>
            </ModalFooter>
          </form>
        </ModalShell>
      )}

      {/* Diálogo confirmación de borrado (con motivo obligatorio) */}
      {borrarDe && (
        <ModalShell
          abierto
          onClose={() => {
            setBorrarDe(null);
            setMotivo("");
          }}
          maxWidth="max-w-md"
        >
          <ModalHeader>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">
              Eliminar requisito legal
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Vas a eliminar{" "}
              <span className="font-medium text-foreground">{borrarDe.titulo}</span>. Queda
              registrado como histórico (no se borra de la base). Indicá el motivo.
            </p>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-2 pb-1">
              <label htmlFor="motivoBorrado" className="text-sm font-medium">
                Motivo
              </label>
              <input
                id="motivoBorrado"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Derogado por nueva normativa"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setBorrarDe(null);
                  setMotivo("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmarBorrado}
                disabled={eliminando === borrarDe.id || motivo.trim().length < 3}
                className="flex-1"
              >
                {eliminando === borrarDe.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Eliminando…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </>
                )}
              </Button>
            </div>
          </ModalFooter>
        </ModalShell>
      )}
    </div>
  );
}
