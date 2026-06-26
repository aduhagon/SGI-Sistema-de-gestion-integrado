"use client";

import {
  useState,
  useTransition,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  Loader2,
  Upload,
  X,
  AlertCircle,
  Wand2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Check,
  Info,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  crearDocumento,
  generarCodigoSugerido,
  type EstadoForm,
} from "@/app/(app)/documentos/nuevo/actions";

type TipoDocumental = {
  id: string;
  codigo: string;
  nombre: string;
  nivel_jerarquico: number | null;
  puede_tener_padre: boolean;
};

type Proceso = {
  id: string;
  codigo: string;
  codigo_numerico: string | null;
  nombre: string;
  tipo: string;
};

type Norma = {
  id: string;
  codigo: string;
  nombre_corto: string;
  nombre_completo: string;
};

type Pais = {
  id: string;
  codigo: string;
  nombre: string;
};

type PosiblePadre = {
  id: string;
  codigo: string;
  titulo: string;
};

type Props = {
  tipos: TipoDocumental[];
  procesos: Proceso[];
  normas: Norma[];
  paises: Pais[];
};

const NIVEL_LABELS: Record<number, string> = {
  1: "Nivel 1 · Rector",
  2: "Nivel 2 · Mapa operativo",
  3: "Nivel 3 · Del proceso",
  4: "Nivel 4 · Derivado (hijo)",
};

const PASOS = [
  { n: 1, titulo: "Clasificación" },
  { n: 2, titulo: "Identificación" },
  { n: 3, titulo: "Archivo y cierre" },
] as const;

const TOTAL_PASOS = PASOS.length;
const BANNER_KEY = "sgi.docform.ayuda.oculta";

export function DocumentForm({ tipos, procesos, normas, paises }: Props) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<EstadoForm>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [normasSeleccionadas, setNormasSeleccionadas] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [paso, setPaso] = useState(1);
  const [ayudaOculta, setAyudaOculta] = useState(false);

  const [paisCodigo, setPaisCodigo] = useState(paises[0]?.codigo ?? "A");
  const [tipoId, setTipoId] = useState<string>("");
  const [procesoId, setProcesoId] = useState<string>("");
  const [padreId, setPadreId] = useState<string>("");
  const [codigo, setCodigo] = useState<string>("");
  const [codigoEditadoManualmente, setCodigoEditadoManualmente] = useState(false);

  // Campos controlados para poder validar por paso.
  const [titulo, setTitulo] = useState<string>("");

  const [posiblesPadres, setPosiblesPadres] = useState<PosiblePadre[]>([]);
  const [cargandoPadres, setCargandoPadres] = useState(false);

  const tipoSeleccionado = tipos.find((t) => t.id === tipoId);
  const requierePadre = tipoSeleccionado?.puede_tener_padre === true;

  const procesosEstrategicos = procesos.filter((p) => p.tipo === "estrategico");
  const procesosOperativos = procesos.filter((p) => p.tipo === "operativo");
  const procesosApoyo = procesos.filter((p) => p.tipo === "apoyo");

  // Preferencia de banner persistida por usuario en el navegador.
  useEffect(() => {
    try {
      if (localStorage.getItem(BANNER_KEY) === "1") setAyudaOculta(true);
    } catch {
      /* localStorage no disponible: se mantiene visible */
    }
  }, []);

  function ocultarAyuda() {
    setAyudaOculta(true);
    try {
      localStorage.setItem(BANNER_KEY, "1");
    } catch {
      /* sin persistencia: igual se oculta en esta sesión */
    }
  }

  useEffect(() => {
    if (!requierePadre || !procesoId) {
      setPosiblesPadres([]);
      setPadreId("");
      return;
    }

    let cancelado = false;
    setCargandoPadres(true);

    fetch(`/api/documentos/posibles-padres?procesoId=${procesoId}`)
      .then((r) => r.json())
      .then((data: PosiblePadre[]) => {
        if (!cancelado) setPosiblesPadres(data ?? []);
      })
      .catch(() => {
        if (!cancelado) setPosiblesPadres([]);
      })
      .finally(() => {
        if (!cancelado) setCargandoPadres(false);
      });

    return () => {
      cancelado = true;
    };
  }, [procesoId, requierePadre]);

  const regenerarCodigo = useCallback(async () => {
    if (codigoEditadoManualmente) return;
    if (!tipoId || !procesoId) return;
    if (requierePadre && !padreId) return;

    const resultado = await generarCodigoSugerido({
      tipoId,
      procesoId,
      paisCodigo,
      padreId: padreId || null,
    });

    if (resultado.ok) {
      setCodigo(resultado.codigo);
    }
  }, [tipoId, procesoId, padreId, paisCodigo, requierePadre, codigoEditadoManualmente]);

  useEffect(() => {
    regenerarCodigo();
  }, [regenerarCodigo]);

  function handleCodigoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCodigo(e.target.value.toUpperCase());
    setCodigoEditadoManualmente(true);
  }

  function resetearCodigo() {
    setCodigoEditadoManualmente(false);
    void regenerarCodigo();
  }

  function toggleNorma(normaId: string) {
    setNormasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(normaId)) next.delete(normaId);
      else next.add(normaId);
      return next;
    });
  }

  function handleArchivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setArchivo(f);
  }

  function quitarArchivo() {
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ---- Validación por paso: habilita "Siguiente" sólo con lo obligatorio del paso ----
  const paso1Completo = useMemo(() => {
    if (!tipoId || !procesoId || !codigo.trim()) return false;
    if (requierePadre && !padreId) return false;
    return true;
  }, [tipoId, procesoId, codigo, requierePadre, padreId]);

  const paso2Completo = useMemo(() => titulo.trim().length > 0, [titulo]);

  const pasoActualCompleto =
    paso === 1 ? paso1Completo : paso === 2 ? paso2Completo : true;

  function irAtras() {
    setPaso((p) => Math.max(1, p - 1));
  }

  function irSiguiente() {
    if (!pasoActualCompleto) return;
    setPaso((p) => Math.min(TOTAL_PASOS, p + 1));
  }

  function handleSubmit(formData: FormData) {
    // Sólo se procesa el submit real en el último paso.
    if (paso !== TOTAL_PASOS) {
      irSiguiente();
      return;
    }

    formData.set("codigo", codigo);
    formData.set("titulo", titulo);
    formData.set("pais_codigo", paisCodigo);
    formData.set("tipo_documental_id", tipoId);
    formData.set("proceso_principal_id", procesoId);
    if (padreId) {
      formData.set("documento_padre_id", padreId);
    } else {
      formData.delete("documento_padre_id");
    }

    formData.delete("normas_ids");
    normasSeleccionadas.forEach((id) => formData.append("normas_ids", id));

    if (archivo) {
      formData.set("archivo", archivo);
    } else {
      formData.delete("archivo");
    }

    startTransition(async () => {
      const resultado = await crearDocumento(estado, formData);
      setEstado(resultado);
      if (resultado && !resultado.ok) {
        // Si el error es de un campo de un paso anterior, volvemos a ese paso.
        if (
          resultado.campo &&
          ["codigo", "tipo_documental_id", "proceso_principal_id", "documento_padre_id"].includes(
            resultado.campo,
          )
        ) {
          setPaso(1);
        } else if (resultado.campo === "titulo" || resultado.campo === "descripcion_corta") {
          setPaso(2);
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const errorEsCampo = (campo: string) =>
    estado && !estado.ok && estado.campo === campo ? estado.error : undefined;

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Indicador de pasos */}
      <Stepper paso={paso} />

      {/* Banner de ayuda descartable, sólo en el paso 1 */}
      {paso === 1 && !ayudaOculta && (
        <div className="flex items-start gap-3 rounded-md border border-primary/20 bg-primary/5 p-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" aria-hidden="true" />
          <p className="flex-1 text-sm text-foreground leading-relaxed">
            El código se genera automáticamente según la nomenclatura formal de MSU.
            Completá la clasificación y avanzá con los pasos. Pasá el cursor sobre los
            íconos{" "}
            <HelpCircle className="inline h-3.5 w-3.5 align-text-bottom text-muted-foreground" aria-hidden="true" />{" "}
            para ver la ayuda de cada campo.
          </p>
          <button
            type="button"
            onClick={ocultarAyuda}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
            aria-label="No mostrar esta ayuda de nuevo"
            title="No mostrar de nuevo"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {estado && !estado.ok && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-medium text-destructive">
              No se pudo crear el documento
            </div>
            <div className="text-sm text-destructive/80 mt-0.5">{estado.error}</div>
          </div>
        </div>
      )}

      {/* ===================== PASO 1 · CLASIFICACIÓN ===================== */}
      <div className={paso === 1 ? "block" : "hidden"}>
        <Section
          titulo="Clasificación"
          descripcion="Definí qué tipo de documento es y a qué proceso pertenece. El código se genera automáticamente según la nomenclatura MSU."
        >
          <Field label="País" required help="País donde aplica el documento.">
            <select
              value={paisCodigo}
              onChange={(e) => setPaisCodigo(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
            >
              {paises.map((p) => (
                <option key={p.id} value={p.codigo}>
                  {p.codigo} — {p.nombre}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Tipo documental"
            required
            help="Definí el nivel jerárquico del documento: rector, mapa operativo, del proceso o derivado."
            error={errorEsCampo("tipo_documental_id")}
          >
            <select
              value={tipoId}
              onChange={(e) => {
                setTipoId(e.target.value);
                setPadreId("");
                setCodigoEditadoManualmente(false);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              required
            >
              <option value="" disabled>
                Seleccionar tipo…
              </option>
              <optgroup label="Documentos rectores (Nivel 1)">
                {tipos.filter((t) => t.nivel_jerarquico === 1).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} — {t.nombre}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Mapa operativo (Nivel 2)">
                {tipos.filter((t) => t.nivel_jerarquico === 2).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} — {t.nombre}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Del proceso (Nivel 3)">
                {tipos.filter((t) => t.nivel_jerarquico === 3).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} — {t.nombre}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Derivados / hijos (Nivel 4)">
                {tipos.filter((t) => t.nivel_jerarquico === 4).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} — {t.nombre}
                  </option>
                ))}
              </optgroup>
            </select>
            {tipoSeleccionado?.nivel_jerarquico && (
              <p className="text-[11px] text-muted-foreground mt-1">
                <Badge variant="muted" size="sm" className="mr-1">
                  {NIVEL_LABELS[tipoSeleccionado.nivel_jerarquico]}
                </Badge>
                {requierePadre &&
                  "Este tipo requiere asociarse a un documento padre."}
              </p>
            )}
          </Field>

          <Field
            label="Proceso principal"
            required
            help="Proceso al que pertenece el documento. Define el segmento de proceso dentro del código."
            error={errorEsCampo("proceso_principal_id")}
          >
            <select
              value={procesoId}
              onChange={(e) => {
                setProcesoId(e.target.value);
                setPadreId("");
                setCodigoEditadoManualmente(false);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={pending}
              required
            >
              <option value="" disabled>
                Seleccionar proceso…
              </option>
              <optgroup label="Estratégicos">
                {procesosEstrategicos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo_numerico} · {p.codigo} — {p.nombre}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Operativos">
                {procesosOperativos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo_numerico} · {p.codigo} — {p.nombre}
                  </option>
                ))}
              </optgroup>
              <optgroup label="De apoyo">
                {procesosApoyo.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo_numerico} · {p.codigo} — {p.nombre}
                  </option>
                ))}
              </optgroup>
            </select>
          </Field>

          {requierePadre && (
            <Field
              label="Documento padre"
              required
              help="Este documento es un hijo. Seleccioná el documento padre del cual deriva. Solo aparecen documentos del mismo proceso."
              error={errorEsCampo("documento_padre_id")}
            >
              <select
                value={padreId}
                onChange={(e) => {
                  setPadreId(e.target.value);
                  setCodigoEditadoManualmente(false);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending || cargandoPadres || !procesoId}
                required
              >
                <option value="" disabled>
                  {!procesoId
                    ? "Primero seleccioná el proceso…"
                    : cargandoPadres
                      ? "Cargando…"
                      : posiblesPadres.length === 0
                        ? "No hay documentos padre en este proceso"
                        : "Seleccionar padre…"}
                </option>
                {posiblesPadres.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.titulo}
                  </option>
                ))}
              </select>
              {posiblesPadres.length === 0 && procesoId && !cargandoPadres && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Este proceso aún no tiene documentos padre cargados. Cargá primero
                  el procedimiento, manual o plan padre, y después este hijo.
                </p>
              )}
            </Field>
          )}
        </Section>

        <div className="mt-6">
          <Section
            titulo="Código del documento"
            descripcion="Se genera automáticamente según la nomenclatura MSU. Podés editarlo manualmente si necesitás un código específico."
          >
            <Field
              label="Código"
              required
              help='Formato: PAÍS-TIPO-PROCESO-NÚMERO o PAÍS-TIPO-PROCESO-PADRE-HIJO. Ej: A-MP-05-001 o A-FOR-05-001-001.'
              error={errorEsCampo("codigo")}
            >
              <div className="flex gap-2">
                <Input
                  value={codigo}
                  onChange={handleCodigoChange}
                  placeholder={
                    !tipoId || !procesoId
                      ? "Seleccioná tipo y proceso para generar"
                      : "A-MP-05-001"
                  }
                  autoCapitalize="characters"
                  disabled={pending}
                  required
                  className={codigoEditadoManualmente ? "" : "font-mono"}
                />
                {codigoEditadoManualmente && (
                  <button
                    type="button"
                    onClick={resetearCodigo}
                    disabled={pending}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Volver al código auto-generado"
                  >
                    <Wand2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Regenerar
                  </button>
                )}
              </div>
              {!codigoEditadoManualmente && codigo && (
                <p className="text-[11px] text-emerald-700 mt-1 flex items-center gap-1">
                  <Wand2 className="h-3 w-3" aria-hidden="true" />
                  Código generado automáticamente
                </p>
              )}
            </Field>
          </Section>
        </div>
      </div>

      {/* ===================== PASO 2 · IDENTIFICACIÓN ===================== */}
      <div className={paso === 2 ? "block" : "hidden"}>
        <Section titulo="Identificación" descripcion="Título y descripción breve del documento.">
          <Field label="Título" required error={errorEsCampo("titulo")}>
            <Input
              name="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Procedimiento de Arrendamiento de Campos"
              disabled={pending}
              required
            />
          </Field>

          <Field
            label="Descripción breve"
            help="Una oración que resuma de qué trata el documento. Opcional."
            error={errorEsCampo("descripcion_corta")}
          >
            <Input
              name="descripcion_corta"
              placeholder="Procedimiento para gestionar el alquiler de campos productivos."
              disabled={pending}
              maxLength={500}
            />
          </Field>
        </Section>

        <div className="mt-6">
          <Section
            titulo="Cobertura normativa"
            descripcion="Qué normas cubre este documento. Podés seleccionar múltiples."
          >
            <div className="flex flex-wrap gap-2">
              {normas.map((n) => {
                const seleccionada = normasSeleccionadas.has(n.id);
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => toggleNorma(n.id)}
                    disabled={pending}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                      seleccionada
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                    title={n.nombre_completo}
                  >
                    <span className="font-mono text-xs">{n.codigo}</span>
                    <span>{n.nombre_corto}</span>
                  </button>
                );
              })}
            </div>
            {normasSeleccionadas.size > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {normasSeleccionadas.size}{" "}
                {normasSeleccionadas.size === 1 ? "norma seleccionada" : "normas seleccionadas"}.
                La primera seleccionada queda como norma principal.
              </p>
            )}
          </Section>
        </div>
      </div>

      {/* ===================== PASO 3 · ARCHIVO Y CIERRE ===================== */}
      <div className={paso === 3 ? "block" : "hidden"}>
        <Section
          titulo="Archivo principal"
          descripcion="Subí el documento en PDF, Word, Excel o PowerPoint. Máximo 50 MB. Opcional."
        >
          {!archivo ? (
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10">
              <label
                htmlFor="archivo-input"
                className="flex flex-col items-center cursor-pointer text-center"
              >
                <Upload className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
                <span className="text-sm font-medium text-foreground mb-1">
                  Hacé click para seleccionar un archivo
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF, Word, Excel, PowerPoint o imágenes · hasta 50 MB
                </span>
                <input
                  ref={fileInputRef}
                  id="archivo-input"
                  name="archivo"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                  onChange={handleArchivoChange}
                  disabled={pending}
                />
              </label>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                <Upload className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{archivo.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(archivo.size / 1024 / 1024).toFixed(2)} MB · {archivo.type || "tipo desconocido"}
                </div>
              </div>
              <button
                type="button"
                onClick={quitarArchivo}
                disabled={pending}
                className="text-muted-foreground hover:text-destructive transition-colors"
                aria-label="Quitar archivo"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </Section>

        <div className="mt-6">
          <Section
            titulo="Motivo de creación"
            descripcion="¿Por qué se está creando este documento? Opcional."
          >
            <textarea
              name="motivo_creacion"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Ej: Documento solicitado por auditoría de seguimiento."
              disabled={pending}
              maxLength={500}
            />
          </Section>
        </div>

        <div className="mt-6 flex items-center gap-2 rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-emerald-700 shrink-0" aria-hidden="true" />
          <span>
            Al confirmar, el documento se crea en estado{" "}
            <Badge variant="muted" size="sm">
              Borrador
            </Badge>
            .
          </span>
        </div>
      </div>

      {/* ===================== NAVEGACIÓN ===================== */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        {paso > 1 ? (
          <Button type="button" variant="ghost" onClick={irAtras} disabled={pending}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Atrás
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Paso {paso} de {TOTAL_PASOS}
          </span>
        )}

        {paso > 1 && (
          <span className="text-xs text-muted-foreground">
            Paso {paso} de {TOTAL_PASOS}
          </span>
        )}

        {paso < TOTAL_PASOS ? (
          <Button type="button" onClick={irSiguiente} disabled={pending || !pasoActualCompleto}>
            Siguiente
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="submit" disabled={pending || !codigo || !titulo.trim()}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creando…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Crear documento
              </>
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

function Stepper({ paso }: { paso: number }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {PASOS.map((p) => {
          const completado = p.n < paso;
          const activo = p.n === paso;
          return (
            <div
              key={p.n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                completado || activo ? "bg-primary" : "bg-border"
              }`}
              aria-hidden="true"
            />
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Paso {paso} de {TOTAL_PASOS} ·{" "}
        <span className="text-foreground font-medium">
          {PASOS.find((p) => p.n === paso)?.titulo}
        </span>
      </p>
    </div>
  );
}

function Section({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-foreground">
          {titulo}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">{descripcion}</p>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  help,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <span>
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </span>
        {help && (
          <span className="group relative inline-flex" tabIndex={0}>
            <HelpCircle
              className="h-3.5 w-3.5 text-muted-foreground cursor-help"
              aria-label={help}
            />
            <span
              role="tooltip"
              className="pointer-events-none absolute left-1/2 bottom-[140%] z-10 w-56 -translate-x-1/2 rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-normal leading-snug text-background opacity-0 shadow-md transition-opacity duration-100 group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {help}
            </span>
          </span>
        )}
      </Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
