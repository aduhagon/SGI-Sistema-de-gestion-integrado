// ============================================================================
// Edge Function: enviar-correo
// ----------------------------------------------------------------------------
// Envía un correo por SMTP. El proveedor (Gmail, Microsoft 365, etc.) se define
// por variables de entorno (secrets), NO en el código. Para cambiar de proveedor,
// solo se cambian los secrets en Supabase — sin tocar esta función.
//
// Secrets requeridos (Supabase > Edge Functions > Secrets):
//   SMTP_HOST       ej: smtp.gmail.com        (M365: smtp.office365.com)
//   SMTP_PORT       ej: 465                   (M365: 587)
//   SMTP_USER       la casilla (ej: sgi@empresa.com)
//   SMTP_PASS       App Password / contraseña de la casilla
//   SMTP_FROM       remitente visible (ej: sgi@empresa.com)
//   SMTP_FROM_NOMBRE  nombre visible (ej: "SGI MSU")
//   SMTP_TLS        "implicit" para puerto 465 (Gmail) | "starttls" para 587 (M365)
//
// Contrato (fijo, no cambia con el proveedor):
//   POST { para: string, asunto: string, cuerpo: string, cuerpoHtml?: string }
//   -> { ok: true } | { ok: false, error: string }
// ============================================================================

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);

  // Endpoint interno: solo las funciones SQL/jobs que poseen service role
  // pueden usar el relay SMTP. verify_jwt por sí solo también acepta anon.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!serviceRoleKey) {
    return json({ ok: false, error: "Configuración interna incompleta." }, 500);
  }
  if (authHeader !== `Bearer ${serviceRoleKey}`) {
    return json({ ok: false, error: "No autorizado." }, 403);
  }

  // Leer config del proveedor desde el entorno.
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASS");
  const from = Deno.env.get("SMTP_FROM") ?? user ?? "";
  const fromNombre = Deno.env.get("SMTP_FROM_NOMBRE") ?? "SGI";
  const tlsMode = (Deno.env.get("SMTP_TLS") ?? "implicit").toLowerCase();

  if (!host || !user || !pass) {
    return json({ ok: false, error: "Faltan secrets SMTP (SMTP_HOST/USER/PASS)." }, 500);
  }

  let payload: { para?: string; asunto?: string; cuerpo?: string; cuerpoHtml?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, error: "Body inválido (se esperaba JSON)." }, 400);
  }

  const { para, asunto, cuerpo, cuerpoHtml } = payload;
  if (!para || !asunto || (!cuerpo && !cuerpoHtml)) {
    return json({ ok: false, error: "Faltan campos: para, asunto, cuerpo." }, 400);
  }

  try {
    const client = new SMTPClient({
      connection: {
        hostname: host,
        port,
        // 465 = TLS implícito; 587 = STARTTLS.
        tls: tlsMode === "implicit",
        auth: { username: user, password: pass },
      },
    });

    await client.send({
      from: `${fromNombre} <${from}>`,
      to: para,
      subject: asunto,
      content: cuerpo ?? "",
      html: cuerpoHtml,
    });

    await client.close();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: `Fallo al enviar: ${String(e)}` }, 500);
  }
});
