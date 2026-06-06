import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Genera una URL firmada de corta duración para descargar el archivo y redirige a ella.
// La RLS de la tabla archivos garantiza que solo se resuelvan archivos visibles
// para el usuario autenticado.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const supabase = createClient();

  // modo: "ver" abre inline en el navegador; por defecto fuerza descarga.
  const modo = req.nextUrl.searchParams.get("modo");
  const esVer = modo === "ver";

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // Traer el archivo (RLS limita a los visibles para el usuario).
  const { data: archivo, error } = await supabase
    .from("archivos")
    .select("nombre_original, mime_type, storage_bucket, storage_path, activo, eliminado_en")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !archivo) {
    return NextResponse.json(
      { error: "Archivo no encontrado o sin permisos." },
      { status: 404 },
    );
  }

  if (!archivo.activo || archivo.eliminado_en) {
    return NextResponse.json(
      { error: "El archivo no está disponible." },
      { status: 410 },
    );
  }

  // URL firmada con expiración corta (300 s = 5 minutos).
  // En modo descarga forzamos el nombre original; en modo ver dejamos que el
  // navegador renderice el contenido inline (sirve para PDF e imágenes).
  const opciones = esVer
    ? undefined
    : { download: archivo.nombre_original as string };

  const { data: signed, error: errSigned } = await supabase.storage
    .from(archivo.storage_bucket as string)
    .createSignedUrl(archivo.storage_path as string, 300, opciones);

  if (errSigned || !signed?.signedUrl) {
    return NextResponse.json(
      { error: `No se pudo generar el enlace: ${errSigned?.message ?? "desconocido"}` },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}
