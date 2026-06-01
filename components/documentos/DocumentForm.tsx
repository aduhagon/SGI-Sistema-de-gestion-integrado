"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2, Upload, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { crearDocumento, type EstadoForm } from "@/app/(app)/documentos/nuevo/actions";

type TipoDocumental = {
  id: string;
  codigo: string;
  nombre: string;
};

type Proceso = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
};

type Norma = {
  id: string;
  codigo: string;
  nombre_corto: string;
  nombre_completo: string;
};

type Props = {
  tipos: TipoDocumental[];
  procesos: Proceso[];
  normas: Norma[];
};

/**
 * Formulario de creación de documento.
 *
 * Estructura:
 *   Sección 1 - Identificación: código, título, descripción corta
 *   Sección 2 - Clasificación: tipo documental, proceso principal
 *   Sección 3 - Cobertura normativa: selección múltiple de normas
 *   Sección 4 - Archivo (opcional): drag & drop o click para subir
 *   Sección 5 - Motivo de creación (opcional)
 *
 * Después de submit exitoso, redirige al detalle del documento.
 */
export function DocumentForm({ tipos, procesos, normas }: Props) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<EstadoForm>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [normasSeleccionadas, setNormasSeleccionadas] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const procesosEstrategicos = procesos.filter((p) => p.tipo === "estrategico");
  const procesosOperativos = procesos.filter((p) => p.tipo === "operativo");
  const procesosApoyo = procesos.filter((p) => p.tipo === "apoyo");

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

  function handleSubmit(formData: FormData) {
    // Reemplazar normas_ids del form con las del estado del cliente
    formData.delete("normas_ids");
    normasSeleccionadas.forEach((id) => formData.append("normas_ids", id));

    // Reemplazar archivo si está en estado
    if (archivo) {
      formData.set("archivo", archivo);
    } else {
      formData.delete("archivo");
    }

    startTransition(async () => {
      const resultado = await crearDocumento(estado, formData);
      // Si llegó acá, es porque hubo error (en success la action hace redirect y nunca retorna acá)
      setEstado(resultado);
      // Scroll al tope para mostrar el error si existe
      if (resultado && !resultado.ok) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const errorEsCampo = (campo: string) =>
    estado && !estado.ok && estado.campo === campo ? estado.error : undefined;

  return (
    <form action={handleSubmit} className="space-y-10">
      {/* Banner de error */}
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

      {/* Sección 1: Identificación */}
      <Section
        titulo="Identificación"
        descripcion="Código único, título y descripción breve del documento."
      >
        <Field
          label="Código"
          required
          help='Mayúsculas, números y guiones. Ej: POL-EST-SGI-001, MAN-SGI-001, PR-OP-AGR-002.'
          error={errorEsCampo("codigo")}
        >
          <Input
            name="codigo"
            placeholder="POL-EST-SGI-001"
            autoCapitalize="characters"
            disabled={pending}
            required
          />
        </Field>

        <Field
          label="Título"
          required
          help="Nombre descriptivo del documento tal como aparecerá en listados y búsquedas."
          error={errorEsCampo("titulo")}
        >
          <Input
            name="titulo"
            placeholder="Política Integrada del SGI"
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
            placeholder="Política integrada de Calidad, Ambiente, SSO e Inocuidad."
            disabled={pending}
            maxLength={500}
          />
        </Field>
      </Section>

      {/* Sección 2: Clasificación */}
      <Section
        titulo="Clasificación"
        descripcion="A qué proceso pertenece y qué tipo de documento del SGI es."
      >
        <Field label="Tipo documental" required error={errorEsCampo("tipo_documental_id")}>
          <select
            name="tipo_documental_id"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            required
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar tipo…
            </option>
            {tipos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} — {t.nombre}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Proceso principal" required error={errorEsCampo("proceso_principal_id")}>
          <select
            name="proceso_principal_id"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pending}
            required
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar proceso…
            </option>
            <optgroup label="Estratégicos">
              {procesosEstrategicos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre}
                </option>
              ))}
            </optgroup>
            <optgroup label="Operativos">
              {procesosOperativos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre}
                </option>
              ))}
            </optgroup>
            <optgroup label="De apoyo">
              {procesosApoyo.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.nombre}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
      </Section>

      {/* Sección 3: Cobertura normativa */}
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

      {/* Sección 4: Archivo (opcional) */}
      <Section
        titulo="Archivo principal"
        descripcion="Subí el documento en PDF, Word, Excel o PowerPoint. Máximo 50 MB. Opcional — podés crear el registro sin archivo y subirlo después."
      >
        {!archivo ? (
          <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10">
            <label
              htmlFor="archivo-input"
              className="flex flex-col items-center cursor-pointer text-center"
            >
              <Upload
                className="h-8 w-8 text-muted-foreground mb-3"
                aria-hidden="true"
              />
              <span className="text-sm font-medium text-foreground mb-1">
                Hacé click para seleccionar un archivo
              </span>
              <span className="text-xs text-muted-foreground">
                PDF, Word, Excel, PowerPoint o imágenes JPG/PNG · hasta 50 MB
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
                {(archivo.size / 1024 / 1024).toFixed(2)} MB ·{" "}
                {archivo.type || "tipo desconocido"}
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

      {/* Sección 5: Motivo */}
      <Section
        titulo="Motivo de creación"
        descripcion="¿Por qué se está creando este documento? Queda registrado en el historial de la versión inicial. Opcional."
      >
        <textarea
          name="motivo_creacion"
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Ej: Documento solicitado por la auditoría de seguimiento de ISO 9001."
          disabled={pending}
          maxLength={500}
        />
      </Section>

      {/* Botones de acción */}
      <div className="flex items-center justify-between border-t border-border pt-6">
        <p className="text-xs text-muted-foreground">
          <Badge variant="muted" size="sm" className="mr-2">
            Borrador
          </Badge>
          El documento se creará en estado borrador.
        </p>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creando…
              </>
            ) : (
              "Crear documento"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------
// Componentes auxiliares de layout del form
// ---------------------------------------------------------------------

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
