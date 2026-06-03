import { NextResponse, type NextRequest } from "next/server";
import { listarPosiblesPadres } from "@/lib/api/documentos";

export async function GET(request: NextRequest) {
  const procesoId = request.nextUrl.searchParams.get("procesoId");

  if (!procesoId) {
    return NextResponse.json({ error: "procesoId requerido" }, { status: 400 });
  }

  const padres = await listarPosiblesPadres(procesoId);
  const simplificados = padres.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    titulo: p.titulo,
  }));

  return NextResponse.json(simplificados);
}
