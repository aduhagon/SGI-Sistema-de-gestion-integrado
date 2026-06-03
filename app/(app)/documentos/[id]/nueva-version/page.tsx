import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calcularProximoNumeroVersion } from "@/lib/api/documentos";
import { NuevaVersionForm } from "@/components/documentos/NuevaVersionForm";

type Props = {
  params: { id: string };
};

export default async function NuevaVersionPage({ params }: Props) {
  const supabase = createClient();

  const { data: documento, error } = await supabase
    .from("documentos")
    .select("id, codigo, titulo")
    .eq("id", params.id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (error || !documento) {
    notFound();
  }

  const { data: ultima } = await supabase
    .from("versiones")
    .select("numero_version, numero_orden")
    .eq("documento_id", params.id)
    .eq("activo", true)
    .order("numero_orden", { ascending: false })
    .limit(1)
    .maybeSingle();

  const ultimaVersion = (ultima?.numero_version as string) ?? "1.0";
  const { numeroVersion: proximaVersion } = await calcularProximoNumeroVersion(params.id);

  return (
    <div className="mx-auto max-w-3xl p-6 sm:p-8 lg:p-10">
      <nav aria-label="Breadcrumb" className="mb-8">
        <Link
          href={`/documentos/${params.id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al detalle del documento
        </Link>
      </nav>

      <header className="mb-10">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">
          Nueva versión
        </p>
        <h1 className="font-serif text-4xl font-semibold tracking-tight mb-3">
          Crear versión {proximaVersion}
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl leading-relaxed">
          Vas a crear una nueva versión del documento. Indicá qué cambió y, si
          corresponde, subí el archivo actualizado.
        </p>
      </header>

      <NuevaVersionForm
        documentoId={documento.id as string}
        codigo={documento.codigo as string}
        tituloDocumento={documento.titulo as string}
        ultimaVersion={ultimaVersion}
        proximaVersion={proximaVersion}
      />
    </div>
  );
}
