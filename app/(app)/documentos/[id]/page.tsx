import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  Download,
  Hash,
  Calendar,
  User,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusDot } from "@/components/documentos/StatusDot";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  params: { id: string };
  searchParams: { creado?: string };
};

type DocumentoDetalle = {
  id: string;
  codigo: string;
  titulo: string;
  descripcion_corta: string | null;
  estado_actual: string;
  criticidad: string;
  confidencialidad: string;
  idioma: string;
  frecuencia_revision: string;
  proxima_revision: string | null;
  requiere_acuse_lectura: boolean;
  creado_en: string;
  actualizado_en: string | null;
  tipo: { codigo: string; nombre: string; color_hex: string | null; icono: string | null } | null;
  proceso: { codigo: string; nombre: string; color_hex: string | null; tipo: string } | null;
  dueno: {
    username: string;
    persona: { nombre: string; apellido: string } | null;
  } | null;
  documento_norma: Array<{
    es_norma_principal: boolean;
    version_norma: {
      version: string;
      norma: { codigo: string; nombre_corto: string; nombre_completo: string } | null;
    } | null;
  }>;
  versiones: Array<{
    id: string;
    numero_version: string;
    numero_orden: number;
    estado: string;
    es_vigente: boolean;
    creado_en: string;
    archivos: Array<{
      id: string;
      tipo_archivo: string;
      nombre_original: string;
      mime_type: string;
      extension: string;
      "tamaño_bytes": number;
      hash_sha256: string;
      storage_bucket: string;
      storage_path: string;
    }>;
  }>;
};

export default async function DocumentoDetallePage({ params, searchParams }: Props) {
  const supabase = createClient();

  const { data: docRaw, error } = await supabase
    .from("documentos")
    .select(
      `
      id,
      codigo,
      titulo,
      descripcion_corta,
      estado_actual,
      criticidad,
      confidencialidad,
      idioma,
      frecuencia_revision,
      proxima_revision,
      requiere_acuse_lectura,
      creado_en,
      actualizado_en,
      tipo:tipos_documentales (codigo, nombre, color_hex, icono),
      proceso:procesos!documentos_proceso_principal_id_fkey (codigo, nombre, color_hex, tipo),
      dueno:usuarios!documentos_dueno_usuario_id_fkey (
        username,
        persona:personas!usuarios_persona_id_fkey (nombre, apellido)
      ),
      documento_norma (
        es_norma_principal,
        version_norma:versiones_norma (
          version,
          norma:normas (codigo, nombre_corto, nombre_completo)
        )
      ),
      versiones (
        id,
        numero_version,
        numero_orden,
        estado,
        es_vigente,
        creado_en,
        archivos (
          id,
          tipo_archivo,
          nombre_original,
          mime_type,
          extension,
          "tamaño_bytes",
          hash_sha256,
          storage_bucket,
          storage_path
        )
      )
      `,
    )
    .eq("id", params.id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="font-serif text-xl text-destructive mb-2">
            Error al cargar el documento
          </h2>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!docRaw) {
    notFound();
  }

  const doc = docRaw as unknown as DocumentoDetalle;

  const versiones = doc.versiones.slice().sort((a, b) => b.numero_orden - a.numero_orden);
  const versionActual = versiones[0];
  const archivoPrincipal =
    versionActual?.archivos?.find((a) => a.tipo_archivo === "principal") ?? null;

  const normas = doc.documento_norma
    .map((dn) => ({
      principal: dn.es_norma_principal,
      version: dn.version_norma?.version ?? "",
      norma: dn.version_norma?.norma ?? null,
    }))
    .filter((n) => n.norma !== null);

  const duenoNombre = doc.dueno?.persona
    ? `${doc.dueno.persona.nombre} ${doc.dueno.persona.apellido}`.trim()
    : doc.dueno?.username ?? "—";

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      {searchParams.creado === "1" && (
        <div className="mb-6 flex items-center gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>
            Documento creado correctamente en estado borrador. Próximamente vas a poder
            enviarlo a aprobación desde acá.
          </span>
        </div>
      )}

      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href="/documentos"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al listado de documentos
        </Link>
      </nav>

      <header className="mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Badge variant="outline" className="font-mono">
            {doc.codigo}
          </Badge>
          {doc.tipo && (
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: `${doc.tipo.color_hex ?? "#475569"}15`,
                color: doc.tipo.color_hex ?? "#475569",
              }}
            >
              {doc.tipo.nombre}
            </span>
          )}
          <StatusDot estado={doc.estado_actual} showLabel />
        </div>

        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-3 leading-tight">
          {doc.titulo}
        </h1>

        {doc.descripcion_corta && (
          <p className="text-base text-muted-foreground leading-relaxed max-w-3xl">
            {doc.descripcion_corta}
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-8">
        <div className="space-y-8">
          <section>
            <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Archivo principal {versionActual && `· Versión ${versionActual.numero_version}`}
            </h2>

            {archivoPrincipal ? (
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary shrink-0">
                      <FileText className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {archivoPrincipal.nombre_original}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3 flex-wrap">
                        <span>{formatearTamano(archivoPrincipal["tamaño_bytes"])}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="uppercase">{archivoPrincipal.extension}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span
                          className="font-mono text-[10px] flex items-center gap-1"
                          title={`SHA256: ${archivoPrincipal.hash_sha256}`}
                        >
                          <Hash className="h-3 w-3" aria-hidden="true" />
                          {archivoPrincipal.hash_sha256.slice(0, 12)}…
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "cursor-not-allowed opacity-60",
                      )}
                      disabled
                      title="La descarga estará disponible próximamente"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Descargar
                    </button>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border text-[11px] text-muted-foreground">
                    Hash SHA256 completo:{" "}
                    <span className="font-mono">{archivoPrincipal.hash_sha256}</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-5 text-sm text-muted-foreground text-center">
                  Este documento todavía no tiene archivo principal cargado.
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h2 className="font-serif text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Normas cubiertas
            </h2>

            {normas.length > 0 ? (
              <div className="space-y-2">
                {normas.map((n, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {n.norma?.codigo}
                      </Badge>
                      <div>
                        <div className="text-sm font-medium">{n.norma?.nombre_corto}</div>
                        <div className="text-xs text-muted-foreground">
                          {n.norma?.nombre_completo} · Versión {n.version}
                        </div>
                      </div>
                    </div>
                    {n.principal && <Badge variant="default">Principal</Badge>}
                  </div>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-5 text-sm text-muted-foreground text-center">
                  Este documento no tiene normas asociadas todavía.
                </CardContent>
              </Card>
            )}
          </section>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Próximas funcionalidades</CardTitle>
              <CardDescription className="leading-relaxed">
                Las acciones de envío a aprobación, registro de elaboradores adicionales,
                acuses de lectura y descarga del archivo se incorporan en las semanas 6-7
                de la Fase 1B.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <aside className="space-y-4">
          <MetaItem
            icon={<Calendar className="h-3.5 w-3.5" />}
            label="Proceso"
            value={doc.proceso ? `${doc.proceso.codigo} — ${doc.proceso.nombre}` : "—"}
            href={doc.proceso ? `/procesos/${doc.proceso.codigo}` : undefined}
          />
          <MetaItem
            icon={<User className="h-3.5 w-3.5" />}
            label="Dueño"
            value={duenoNombre}
          />
          <MetaItem label="Criticidad" value={capitalizar(doc.criticidad)} />
          <MetaItem label="Confidencialidad" value={capitalizar(doc.confidencialidad)} />
          <MetaItem label="Idioma" value={doc.idioma.toUpperCase()} />
          <MetaItem label="Revisión" value={capitalizar(doc.frecuencia_revision)} />
          {doc.proxima_revision && (
            <MetaItem
              label="Próxima revisión"
              value={new Date(doc.proxima_revision).toLocaleDateString("es-AR")}
            />
          )}
          <MetaItem
            label="Acuse de lectura"
            value={doc.requiere_acuse_lectura ? "Requerido" : "No requerido"}
          />
          <MetaItem
            label="Creado"
            value={new Date(doc.creado_en).toLocaleDateString("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </aside>
      </div>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-md p-3 -m-3 hover:bg-muted/40 transition-colors"
      >
        {content}
      </Link>
    );
  }

  return <div>{content}</div>;
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function capitalizar(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}
