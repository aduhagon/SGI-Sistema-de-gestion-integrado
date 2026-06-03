"use client";

import { useState, useTransition, useRef } from "react";
import { Loader2, Upload, X, AlertCircle, GitBranch } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  crearNuevaVersion,
  type EstadoNuevaVersion,
} from "@/app/(app)/documentos/[id]/nueva-version/actions";

type Props = {
  documentoId: string;
  codigo: string;
  tituloDocumento: string;
  ultimaVersion: string;
  proximaVersion: string;
};

export function NuevaVersionForm({
  documentoId,
  codigo,
  tituloDocumento,
  ultimaVersion,
  proximaVersion,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<EstadoNuevaVersion>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleArchivoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setArchivo(f);
  }

  function quitarArchivo() {
    setArchivo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(formData: FormData) {
    if (archivo) {
      formData.set("archivo", archivo);
    } else {
      formData.delete("archivo");
    }

    startTransition(async () => {
      const resultado = await crearNuevaVersion(documentoId, estado, formData);
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
              No se pudo crear la nueva versión
            </div>
            <div className="text-sm text-destructive/80 mt-0.5">{estado.error}</div>
          </div>
        </div>
      )}

      <Section
        titulo="Versionado"
        descripcion="Información del cambio de versión que estás haciendo."
      >
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3 mb-4">
            <GitBranch className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <div className="flex-1">
              <div className="text-sm font-medium">{tituloDocumento}</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">{codigo}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <Badge variant="muted" className="font-mono">
              v{ultimaVersion}
            </Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="default" className="font-mono">
              v{proximaVersion}
            </Badge>
            <span className="text-xs text-muted-foreground ml-auto">
              Se crea en estado borrador
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
            La nueva versión se crea en borrador. La versión actual <strong>v{ultimaVersion}</strong> sigue
            siendo la vigente hasta que la nueva sea aprobada (próximamente en Semana 7).
          </p>
        </div>
      </Section>

      <Section
        titulo="Archivo de la nueva versión"
        descripcion="Subí el documento modificado. Es opcional: podés crear la versión sin archivo si vas a trabajar en borrador."
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

      <Section
        titulo="Motivo del cambio"
        descripcion="Describí qué cambió respecto de la versión anterior. Este campo es OBLIGATORIO y queda en el historial del documento."
      >
        <div className="space-y-1.5">
          <Label>
            ¿Qué cambió?<span className="text-destructive ml-0.5">*</span>
          </Label>
          <textarea
            name="motivo_cambio"
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Ej: Actualización del procedimiento por cambio en la normativa de SENASA / Incorporación de nuevo punto sobre auditorías de terceros / Corrección de inconsistencias en el flujo de aprobación de proveedores."
            disabled={pending}
            maxLength={1000}
            required
            minLength={10}
          />
          {errorEsCampo("motivo_cambio") ? (
            <p className="text-xs text-destructive">{errorEsCampo("motivo_cambio")}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Mínimo 10 caracteres. Este texto queda visible en el historial de versiones.
            </p>
          )}
        </div>
      </Section>

      <div className="flex items-center justify-between border-t border-border pt-6">
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Badge variant="muted" size="sm">
            <GitBranch className="h-3 w-3 mr-1" aria-hidden="true" />
            Versión {proximaVersion}
          </Badge>
          Se crea en estado borrador, no vigente.
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Creando versión…
            </>
          ) : (
            `Crear versión ${proximaVersion}`
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
      <div>{children}</div>
    </section>
  );
}
