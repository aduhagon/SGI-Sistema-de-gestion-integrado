import { NextResponse, type NextRequest } from "next/server";
import { listarPosiblesPadres } from "@/lib/api/documentos";

/**
 * GET /api/documentos/posibles-padres?procesoId=xxx
 *
 * Devuelve los documentos del proceso que pueden ser padre de un documento hijo
 * (es decir, documentos de Nivel 1, 2 o 3, sin documento_padre_id propio).
 *
 * Se llama desde el form de creación cuando el usuario selecciona un tipo hijo
 * (formulario, instructivo, anexo, doc externa) y un proceso.
 */
export async function GET(request: NextRequest) {
  const procesoId = request.nextUrl.searchParams.get("procesoId");

  if (!procesoId) {
    return NextResponse.json({ error: "procesoId requerido" }, { status: 400 });
  }

  const padres = await listarPosiblesPadres(procesoId);
  // Devolvemos solo lo que el form necesita
  const simplificados = padres.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    titulo: p.titulo,
  }));

  return NextResponse.json(simplificados);
}
