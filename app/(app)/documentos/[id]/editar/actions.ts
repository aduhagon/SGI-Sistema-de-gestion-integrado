"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { editarMetadataSchema } from "@/lib/schemas/edicion";

export type EstadoEditar =
  | { ok: true }
  | { ok: false; error: string; campo?: string }
  | null;

export async function editarMetadata(
  documentoId: string,
  _estadoPrevio: EstadoEditar,
  formData: FormData,
): Promise<EstadoEditar> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sesión no válida. Volvé a ingresar." };
  }

  const rawNormas = formData.getAll("normas_ids");
  const parsed = editarMetadataSchema.safeParse({
    codigo: formData.get("codigo") ?? undefined,
    titulo: formData.get("titulo"),
    tipo_documental_id: formData.get("tipo_documental_id") ?? undefined,
    proceso_principal_id: formData.get("proceso_principal_id") ?? undefined,
    descripcion_corta: formData.get("descripcion_corta") ?? undefined,
    criticidad: formData.get("criticidad"),
    confidencialidad: formData.get("confidencialidad"),
    idioma: formData.get("idioma"),
    frecuencia_revision: formData.get("frecuencia_revision"),
    requiere_acuse_lectura: formData.get("requiere_acuse_lectura") === "on" ||
                            formData.get("requiere_acuse_lectura") === "true",
    normas_ids: rawNormas.filter((v): v is string => typeof v === "string" && v.length > 0),
    motivo_edicion: formData.get("motivo_edicion"),
  });

  if (!parsed.success) {
    const primerError = parsed.error.issues[0];
    return {
      ok: false,
      error: primerError.message,
      campo: primerError.path.join("."),
    };
  }

  const input = parsed.data;

  const { data: docExiste } = await supabase
    .from("documentos")
    .select("id, codigo, estado_actual")
    .eq("id", documentoId)
    .is("eliminado_en", null)
    .maybeSingle();

  if (!docExiste) {
    return { ok: false, error: "El documento no existe o fue eliminado." };
  }

  // El código, el tipo y el proceso solo pueden cambiarse mientras el documento
  // está en borrador o confeccionado (todavía no es información documentada
  // controlada). En otros estados se ignora cualquier cambio de clasificación.
  const clasificacionEditable = ["borrador", "confeccionado"].includes(
    docExiste.estado_actual as string,
  );

  let codigoFinal = docExiste.codigo as string;

  if (clasificacionEditable && input.codigo && input.codigo !== docExiste.codigo) {
    // Validar que no exista otro documento con ese código (UNIQUE global).
    const { data: colision } = await supabase
      .from("documentos")
      .select("id")
      .ilike("codigo", input.codigo)
      .neq("id", documentoId)
      .maybeSingle();

    if (colision) {
      return {
        ok: false,
        error: `Ya existe otro documento con el código ${input.codigo}. Elegí uno distinto.`,
        campo: "codigo",
      };
    }
    codigoFinal = input.codigo;
  }

  // Campos de clasificación a persistir solo si el documento es editable.
  const camposClasificacion: {
    codigo?: string;
    tipo_documental_id?: string;
    proceso_principal_id?: string;
  } = {};

  if (clasificacionEditable) {
    camposClasificacion.codigo = codigoFinal;
    if (input.tipo_documental_id) {
      camposClasificacion.tipo_documental_id = input.tipo_documental_id;
    }
    if (input.proceso_principal_id) {
      camposClasificacion.proceso_principal_id = input.proceso_principal_id;
    }
  }

  const { error: errUpd } = await supabase
    .from("documentos")
    .update({
      ...camposClasificacion,
      titulo: input.titulo,
      descripcion_corta: input.descripcion_corta ?? null,
      criticidad: input.criticidad,
      confidencialidad: input.confidencialidad,
      idioma: input.idioma,
      frecuencia_revision: input.frecuencia_revision,
      requiere_acuse_lectura: input.requiere_acuse_lectura,
    })
    .eq("id", documentoId);

  if (errUpd) {
    // Captura defensiva del choque de unicidad por si hubo una carrera.
    if (errUpd.code === "23505" || /codigo/i.test(errUpd.message)) {
      return {
        ok: false,
        error: `El código ${codigoFinal} ya está en uso por otro documento.`,
        campo: "codigo",
      };
    }
    return {
      ok: false,
      error: `Error actualizando el documento: ${errUpd.message}`,
    };
  }

  await supabase.from("documento_norma").delete().eq("documento_id", documentoId);

  if (input.normas_ids.length > 0) {
    const { data: versionesVigentes } = await supabase
      .from("versiones_norma")
      .select("id, norma_id")
      .in("norma_id", input.normas_ids)
      .eq("es_version_actual", true);

    if (versionesVigentes && versionesVigentes.length > 0) {
      const rels = versionesVigentes.map((vn, idx) => ({
        documento_id: documentoId,
        version_norma_id: vn.id,
        es_norma_principal: idx === 0,
      }));
      await supabase.from("documento_norma").insert(rels);
    }
  }

  revalidatePath("/documentos");
  revalidatePath(`/documentos/${documentoId}`);
  revalidatePath("/dashboard");

  redirect(`/documentos/${documentoId}?editado=1`);
}
