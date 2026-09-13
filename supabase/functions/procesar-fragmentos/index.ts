import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";
import { strFromU8, unzipSync } from "fflate";
import { extractText, getDocumentProxy } from "unpdf";
import { type Linea, limpiarRepetidos, segmentar } from "./segmentar.ts";

const ADMIN_FALLBACK = "4c662526-5091-4f07-af9f-7be14ff77864";

function desescapar(s: string): string {
  return s
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function lineasDocx(buf: Uint8Array): { lineas: Linea[]; estilos: Set<string> } {
  const zip = unzipSync(buf);
  const doc = zip["word/document.xml"];
  if (!doc) throw new Error("El .docx no contiene word/document.xml");
  let xml = strFromU8(doc);
  xml = xml.replace(/<w:instrText[\s\S]*?<\/w:instrText>/g, "");

  const parrafos = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
  const out: Linea[] = [];
  const estilos = new Set<string>();

  for (const p of parrafos) {
    const estilo = /<w:pStyle[^>]*w:val="([^"]+)"/.exec(p)?.[1];
    if (estilo) estilos.add(estilo);
    if (estilo && /^(TOC|Tablade|TDC|ndice|Indice)/i.test(estilo)) continue;

    const nivelIlvl = /<w:ilvl[^>]*w:val="(\d)"/.exec(p)?.[1];
    const esNumerado = /<w:numPr>/.test(p);

    const partes = [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
      .map((m) => m[1]);
    const texto = desescapar(partes.join("")).replace(/\s+/g, " ").trim();
    if (!texto) continue;

    const linea: Linea = { texto, estilo };
    if (esNumerado && nivelIlvl !== undefined && /head|t[ií]?tulo|ttulo/i.test(estilo ?? "")) {
      linea.nivelEstilo = Number(nivelIlvl) + 1;
    }
    out.push(linea);
  }
  return { lineas: out, estilos };
}

async function lineasPdf(buf: Uint8Array): Promise<Linea[]> {
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: false });
  const paginas = (text as string[]).map((t) =>
    t.split(/\r?\n/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean)
  );
  const limpias = limpiarRepetidos(paginas);
  const out: Linea[] = [];
  limpias.forEach((lineas, i) => {
    for (const texto of lineas) out.push({ texto, pagina: i + 1 });
  });
  return out;
}

Deno.serve(async (req: Request) => {
  const cors = { "Content-Type": "application/json" };
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false, error: "Método no permitido." }), {
      status: 405,
      headers: cors,
    });
  }

  // Solo el trigger/job interno puede ejecutar procesamiento con service role.
  // verify_jwt por sí solo también considera válido el token anon del proyecto.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ ok: false, error: "No autorizado." }), {
      status: 403,
      headers: cors,
    });
  }

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const versionIds: string[] | null = body.version_ids ?? null;
    const soloVigentes: boolean = body.solo_vigentes ?? !versionIds;
    const limite: number = Math.min(body.limite ?? 25, 50);
    const seco: boolean = body.dry_run === true;
    const actor: string = body.actor_id ?? ADMIN_FALLBACK;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let q = supabase
      .from("archivos")
      .select(
        "id, version_id, extension, storage_bucket, storage_path, versiones!inner(id, es_vigente, eliminado_en)",
      )
      .eq("tipo_archivo", "principal")
      .eq("contexto", "documento")
      .is("eliminado_en", null)
      .in("extension", ["docx", "pdf"])
      .limit(limite);

    if (versionIds) q = q.in("version_id", versionIds);
    if (soloVigentes) q = q.eq("versiones.es_vigente", true);

    const { data: archivos, error: errQ } = await q;
    if (errQ) throw new Error(`Consulta de archivos: ${errQ.message}`);

    const resultados: unknown[] = [];

    for (const a of archivos ?? []) {
      try {
        const { data: blob, error: errD } = await supabase.storage
          .from(a.storage_bucket)
          .download(a.storage_path);
        if (errD || !blob) throw new Error(`Descarga: ${errD?.message ?? "vacio"}`);

        const buf = new Uint8Array(await blob.arrayBuffer());
        let lineas: Linea[];
        let estilosVistos: string[] = [];
        if (a.extension === "docx") {
          const r = lineasDocx(buf);
          lineas = r.lineas;
          estilosVistos = [...r.estilos].slice(0, 12);
        } else {
          lineas = await lineasPdf(buf);
        }
        const fragmentos = segmentar(lineas);

        const conNumeral = fragmentos.filter((f) => f.numeral).length;
        const base = {
          version_id: a.version_id,
          archivo_id: a.id,
          extension: a.extension,
          lineas: lineas.length,
          fragmentos: fragmentos.length,
          con_numeral: conNumeral,
          estilos: estilosVistos,
          muestra: fragmentos.slice(0, 5).map((f) => ({
            numeral: f.numeral,
            titulo: f.titulo,
            chars: f.texto.length,
            inicio: f.texto.slice(0, 70),
          })),
        };

        if (seco) {
          resultados.push({ ...base, guardado: false });
          continue;
        }

        const { data: rpc, error: errR } = await supabase.rpc(
          "fn_guardar_fragmentos_version",
          {
            p_version_id: a.version_id,
            p_archivo_id: a.id,
            p_fragmentos: fragmentos,
            p_actor_id: actor,
          },
        );
        if (errR) throw new Error(`RPC: ${errR.message}`);
        resultados.push({ ...base, guardado: true, rpc });
      } catch (e) {
        resultados.push({
          version_id: a.version_id,
          archivo_id: a.id,
          extension: a.extension,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        dry_run: seco,
        procesados: resultados.length,
        resultados,
      }, null, 2),
      { headers: cors },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: cors },
    );
  }
});
