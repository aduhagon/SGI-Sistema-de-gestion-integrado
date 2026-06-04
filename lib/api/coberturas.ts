import { createClient } from "@/lib/supabase/server";

export type RequisitoOpcion = {
  id: string;
  clausula: string;
  titulo: string;
};

export type CoberturaActual = {
  coberturaId: string;
  requisitoId: string;
  clausula: string;
  requisitoTitulo: string;
  normaCodigo: string;
  tipoCobertura: "total" | "parcial" | "referencia";
  seccionDocumento: string | null;
};

/** Requisitos de una versión de norma, para el selector del diálogo. */
export async function obtenerRequisitosDeNorma(
  versionNormaId: string,
): Promise<RequisitoOpcion[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("requisitos")
    .select("id, clausula, titulo")
    .eq("version_norma_id", versionNormaId)
    .eq("activo", true);

  if (error) throw new Error(`No se pudieron cargar los requisitos: ${error.message}`);

  const ordenar = (a: string, b: string) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da !== db) return da - db;
    }
    return 0;
  };

  return ((data ?? []) as RequisitoOpcion[]).sort((a, b) =>
    ordenar(a.clausula, b.clausula),
  );
}

/** Coberturas actuales de un documento (lo que ya cubre). */
export async function obtenerCoberturasDeDocumento(
  documentoId: string,
): Promise<CoberturaActual[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coberturas")
    .select(
      `id, tipo_cobertura, seccion_documento,
       requisitos:requisitos!coberturas_requisito_id_fkey (
         id, clausula, titulo,
         versiones_norma:versiones_norma!requisitos_version_norma_id_fkey (
           normas:normas!versiones_norma_norma_id_fkey (codigo)
         )
       )`,
    )
    .eq("documento_id", documentoId)
    .eq("activo", true)
    .is("eliminado_en", null);

  if (error) throw new Error(`No se pudieron cargar las coberturas: ${error.message}`);

  type Fila = {
    id: string;
    tipo_cobertura: string;
    seccion_documento: string | null;
    requisitos: {
      id: string;
      clausula: string;
      titulo: string;
      versiones_norma: { normas: { codigo: string } | null } | null;
    } | null;
  };

  return ((data ?? []) as unknown as Fila[])
    .filter((c) => c.requisitos)
    .map((c) => ({
      coberturaId: c.id,
      requisitoId: c.requisitos!.id,
      clausula: c.requisitos!.clausula,
      requisitoTitulo: c.requisitos!.titulo,
      normaCodigo: c.requisitos!.versiones_norma?.normas?.codigo ?? "—",
      tipoCobertura: c.tipo_cobertura as "total" | "parcial" | "referencia",
      seccionDocumento: c.seccion_documento,
    }));
}
