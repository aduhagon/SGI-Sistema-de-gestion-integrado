import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { obtenerFragmentosDeDocumento } from "@/lib/api/referencias";
import { obtenerNormasConRequisitos } from "@/lib/api/matriz";
import { obtenerRequisitosDeNorma, type RequisitoOpcion } from "@/lib/api/coberturas";
import { PanelReferenciado } from "@/components/referencias/PanelReferenciado";

export const dynamic = "force-dynamic";

type Props = { params: { id: string } };

export default async function ReferenciasDocumentoPage({ params }: Props) {
  const supabase = createClient();

  const { data: documento } = await supabase
    .from("documentos")
    .select("id, codigo, titulo")
    .eq("id", params.id)
    .is("eliminado_en", null)
    .maybeSingle();

  if (!documento) notFound();

  const [fragmentos, normas, { data: esAuditorSgi }] = await Promise.all([
    obtenerFragmentosDeDocumento(documento.id),
    obtenerNormasConRequisitos(),
    supabase.rpc("fn_usuario_es_auditor_o_sgi"),
  ]);

  const requisitosPorNorma: Record<string, RequisitoOpcion[]> = {};
  for (const n of normas) {
    requisitosPorNorma[n.versionNormaId] = await obtenerRequisitosDeNorma(
      n.versionNormaId,
    );
  }

  const totalReferencias = fragmentos.reduce(
    (acc, f) => acc + f.referencias.length,
    0,
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <Link
          href={`/documentos/${documento.id}`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Volver al documento
        </Link>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-mono text-lg font-semibold">{documento.codigo}</h1>
          <span className="text-muted-foreground">{documento.titulo}</span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Referencias normativas por bloque · {fragmentos.length} bloques ·{" "}
          {totalReferencias} referencias
        </p>
      </div>

      <PanelReferenciado
        documentoId={documento.id}
        fragmentos={fragmentos}
        normas={normas}
        requisitosPorNorma={requisitosPorNorma}
        puedeEditar={Boolean(esAuditorSgi)}
      />
    </div>
  );
}
