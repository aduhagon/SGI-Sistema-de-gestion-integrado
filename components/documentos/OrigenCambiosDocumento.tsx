import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function OrigenCambiosDocumento({ documentoId }: { documentoId: string }) {
  const { data, error } = await createClient().from("acciones")
    .select("id,codigo,titulo,no_conformidad_id,version:versiones!acciones_version_documento_resultante_id_fkey!inner(numero_version,documento_id)")
    .eq("version.documento_id", documentoId).eq("activo", true).is("eliminado_en", null)
    .order("creado_en", { ascending: false }).limit(50);
  if (error) throw new Error(`No se pudo cargar el origen correctivo: ${error.message}`);
  if (!data?.length) return null;
  return <section className="mb-8 border-y border-border py-4">
    <h2 className="mb-3 text-sm font-semibold">Acciones vinculadas</h2>
    <ul className="space-y-2 text-sm">{data.map((a) => <li key={a.id}>
      <Link href={`/ncs/${a.no_conformidad_id}`} className="break-words text-primary underline">{a.codigo} · {a.titulo}</Link>
    </li>)}</ul>
  </section>;
}
