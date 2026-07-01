"use client";

import { useState, useTransition } from "react";
import { Loader2, AlertCircle, Lock, FileText, Upload, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  editarMetadata,
  type EstadoEditar,
} from "@/app/(app)/documentos/[id]/editar/actions";
import {
  adjuntarArchivo,
  type EstadoAdjuntar,
} from "@/app/(app)/documentos/[id]/adjuntar-archivo-actions";
import type { DocumentoParaEditar } from "@/lib/api/documentos";

type Norma = {
  id: string;
  codigo: string;
  nombre_corto: string;
  nombre_completo: string;
};

type Props = {
  documento: DocumentoParaEditar;
  normas: Norma[];
};

const CRITICIDAD_OPCIONES = [
  { value: "bajo", label: "Bajo" },
  { value: "medio", label: "Medio" },
  { value: "alto", label: "Alto" },
  { value: "critico", label: "Crítico" },
] as const;

const CONFIDENCIALIDAD_OPCIONES = [
  { value: "publico", label: "Público" },
  { value: "interno", label: "Interno" },
  { value: "confidencial", label: "Confidencial" },
  { value: "restringido", label: "Restringido" },
] as const;

const FRECUENCIA_OPCIONES = [
  { value: "sin_revision", label: "Sin revisión programada" },
  { value: "anual", label: "Anual" },
  { value: "bienal", label: "Bienal (cada 2 años)" },
  { value: "trienal", label: "Trienal (cada 3 años)" },
  { value: "quinquenal", label: "Quinquenal (cada 5 años)" },
] as const;

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EditarMetadataForm({ documento, normas }: Props) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<EstadoEditar>(null);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [normasSeleccionadas, setNormasSeleccionadas] = useState<Set<string>>(
    new Set(documento.normas_ids),
  );
  const [requiereAcuse, setRequiereAcuse] = useState(documento.requiere_acuse_lectura);
  const [archivoNuevo, setArchivoNuevo] = useState<File | null>(null);

  const archivoEditable = documento.archivoEditable;

  function toggleNorma(normaId: string) {
    setNormasSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(normaId)) next.delete(normaId);
      else next.add(normaId);
      return next;
    });
  }

  function handleSubmit(formData: FormData) {
    formData.delete("normas_ids");
    normasSeleccionadas.forEach((id) => formData.append("normas_ids", id));
    formData.set("requiere_acuse_lectura", requiereAcuse ? "true" : "false");

    // El archivo nuevo se procesa con su propia action; lo sacamos del FormData
    // de metadata para no mezclarlos.
    formData.delete("archivo");

    startTransition(async () => {
      setErrorArchivo(null);

      // 1) Si se eligió un archivo nuevo, reemplazarlo primero. Si falla, abortar
      //    sin tocar la metadata (así no queda un cambio a medias).
      if (archivoEditable && archivoNuevo) {
        const fdArchivo = new FormData();
        fdArchivo.set("archivo", archivoNuevo);
        const resArchivo: EstadoAdjuntar = await adjuntarArchivo(
          documento.id,
          null,
          fdArchivo,
        );
        if (resArchivo && !resArchivo.ok) {
          setErrorArchivo(resArchivo.error);
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
      }

      // 2) Guardar la metadata. editarMetadata hace el redirect al detalle si OK.
      const resultado = await editarMetadata(documento.id, estado, formData);
      setEstado(resultado);
      if (resultado && !resultado.ok) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const errorEsCampo = (campo: string) =>
    estado && !estado.ok && estado.campo === campo ? estado.error : undefined;

  return (
    <form action={handleSubmit} className="space-y-10">
      {estado && !estado.ok && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-medium text-destructive">
              No se pudo guardar la edición
            </div>
            <div className="text-sm text-destructive/80 mt-0.5">{estado.error}</div>
          </div>
        </div>
      )}

      {errorArchivo && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4"
        >
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
          <div className="flex-1">
            <div className="text-sm font-medium text-destructive">
              No se pudo reemplazar el archivo
            </div>
            <div className="text-sm text-destructive/80 mt-0.5">{errorArchivo}</div>
          </div>
        </div>
      )}

      <Section
        titulo="Identidad del documento"
        descripcion={
          archivoEditable
            ? "El documento está en borrador: podés ajustar el código si hace falta. El tipo y el proceso no se modifican; si necesitás cambiarlos, cargá un documento nuevo."
            : "Estos campos no se pueden modificar para preservar la trazabilidad. Si necesitás cambiar el código o el tipo, cargá un documento nuevo."
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {archivoEditable ? (
            <Field
              label="Código"
              required
              help="Nomenclatura PAÍS-TIPO-PROCESO-NÚMERO."
              error={errorEsCampo("codigo")}
            >
              <Input
                name="codigo"
                defaultValue={documento.codigo}
                disabled={pending}
                required
                className="font-mono uppercase"
              />
            </Field>
          ) : (
            <ReadonlyField label="Código" value={documento.codigo} mono />
          )}
          <ReadonlyField
            label="Tipo"
            value={documento.tipo ? `${documento.tipo.codigo} — ${documento.tipo.nombre}` : "—"}
          />
          <ReadonlyField
            label="Proceso"
            value={documento.proceso ? `${documento.proceso.codigo} — ${documento.proceso.nombre}` : "—"}
          />
        </div>
      </Section>

      <Section
        titulo="Identificación"
        descripcion="Título y descripción que se muestran en listados y búsquedas."
      >
        <Field label="Título" required error={errorEsCampo("titulo")}>
          <Input
            name="titulo"
            defaultValue={documento.titulo}
            disabled={pending}
            required
          />
        </Field>

        <Field
          label="Descripción breve"
          help="Opcional."
          error={errorEsCampo("descripcion_corta")}
        >
          <Input
            name="descripcion_corta"
            defaultValue={documento.descripcion_corta ?? ""}
            disabled={pending}
            maxLength={500}
          />
        </Field>
      </Section>

      {archivoEditable && (
        <Section
          titulo="Archivo principal"
          descripcion="Mientras el documento esté en borrador podés reemplazar el archivo sin crear una versión nueva. El archivo anterior se descarta."
        >
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted shrink-0">
                <FileText className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Archivo actual
                </div>
                {documento.archivoActual ? (
                  <div className="text-sm text-foreground truncate">
                    {documento.archivoActual.nombre_original}
                    <span className="text-muted-foreground ml-2">
                      ({formatearTamano(documento.archivoActual["tamaño_bytes"])})
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-amber-700">
                    Esta versión todavía no tiene archivo cargado.
                  </div>
                )}
              </div>
            </div>

            <Field
              label={documento.archivoActual ? "Reemplazar archivo" : "Cargar archivo"}
              help="Dejá este campo vacío para conservar el archivo actual."
            >
              <label
                className={`flex items-center gap-3 rounded-md border border-dashed px-4 py-3 cursor-pointer transition-colors ${
                  archivoNuevo
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted/50"
                } ${pending ? "pointer-events-none opacity-50" : ""}`}
              >
                {archivoNuevo ? (
                  <RefreshCw className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                )}
                <span className="text-sm truncate">
                  {archivoNuevo ? (
                    <span className="text-primary font-medium">
                      {archivoNuevo.name}{" "}
                      <span className="text-muted-foreground font-normal">
                        ({formatearTamano(archivoNuevo.size)})
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Elegí un archivo para subir…
                    </span>
                  )}
                </span>
                <input
                  type="file"
                  name="archivo"
                  className="sr-only"
                  disabled={pending}
                  onChange={(e) => {
                    setArchivoNuevo(e.target.files?.[0] ?? null);
                    setErrorArchivo(null);
                  }}
                />
              </label>
            </Field>

            {archivoNuevo && (
              <button
                type="button"
                onClick={() => setArchivoNuevo(null)}
                disabled={pending}
                className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
              >
                Descartar archivo elegido y conservar el actual
              </button>
            )}
          </div>
        </Section>
      )}

      <Section
        titulo="Clasificación y manejo"
        descripcion="Cómo se debe tratar este documento dentro del SGI."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Criticidad" required error={errorEsCampo("criticidad")}>
            <select
              name="criticidad"
              defaultValue={documento.criticidad}
              disabled={pending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {CRITICIDAD_OPCIONES.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Confidencialidad" required error={errorEsCampo("confidencialidad")}>
            <select
              name="confidencialidad"
              defaultValue={documento.confidencialidad}
              disabled={pending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {CONFIDENCIALIDAD_OPCIONES.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Idioma" required help="Código de 2 letras (es, en, pt, etc.)" error={errorEsCampo("idioma")}>
            <Input
              name="idioma"
              defaultValue={documento.idioma}
              disabled={pending}
              maxLength={2}
              className="font-mono uppercase"
            />
          </Field>

          <Field
            label="Frecuencia de revisión"
            required
            error={errorEsCampo("frecuencia_revision")}
          >
            <select
              name="frecuencia_revision"
              defaultValue={documento.frecuencia_revision}
              disabled={pending}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {FRECUENCIA_OPCIONES.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <input
            type="checkbox"
            id="requiere_acuse_lectura"
            checked={requiereAcuse}
            onChange={(e) => setRequiereAcuse(e.target.checked)}
            disabled={pending}
            className="h-4 w-4 rounded border-input"
          />
          <label htmlFor="requiere_acuse_lectura" className="text-sm cursor-pointer">
            Requiere acuse de lectura
            <span className="block text-xs text-muted-foreground mt-0.5">
              Los lectores deberán confirmar haberlo leído.
            </span>
          </label>
        </div>
      </Section>

      <Section
        titulo="Cobertura normativa"
        descripcion="Normas que cubre este documento. La primera seleccionada queda como principal."
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
      </Section>

      <Section
        titulo="Motivo de la edición"
        descripcion="Indicá por qué hacés esta edición. Queda registrado para trazabilidad."
      >
        <Field label="Motivo" required error={errorEsCampo("motivo_edicion")}>
          <textarea
            name="motivo_edicion"
            className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Ej: Corrección de typo en el título / Reemplazo del archivo por la versión corregida / Agregado de cobertura ISO 14001."
            disabled={pending}
            maxLength={500}
            required
          />
        </Field>
      </Section>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Badge variant="muted" size="sm">
            <Lock className="h-3 w-3 mr-1" aria-hidden="true" />
            Edición en borrador
          </Badge>
          {archivoEditable
            ? "Cambios de metadata y archivo, sin generar nueva versión."
            : "No genera nueva versión."}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Guardando…
            </>
          ) : (
            "Guardar cambios"
          )}
        </Button>
      </div>
    </form>
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
      <Label>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : help ? (
        <p className="text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

function ReadonlyField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Lock className="h-3 w-3" aria-hidden="true" />
        {label}
      </div>
      <div className={`text-sm text-foreground/70 ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
