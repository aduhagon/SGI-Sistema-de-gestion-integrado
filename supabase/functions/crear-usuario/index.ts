/// =====================================================================
// Edge Function: crear-usuario
// =====================================================================
// Crea una cuenta de autenticación por INVITACIÓN y la vincula a una
// persona existente (fila en public.usuarios).
//
// Flujo (Camino A - invitación por email):
//   1. Verifica que el llamador sea admin/SGI.
//   2. Invita al usuario por email (inviteUserByEmail): se crea la cuenta
//      sin contraseña y se le manda un mail para que defina la suya.
//   3. Vincula la cuenta a la persona insertando la fila en usuarios.
//   4. Como respaldo (por si el email no está configurado todavía),
//      genera también el enlace de invitación y lo devuelve, para que
//      el admin pueda pasárselo manualmente.
//
// Seguridad: la service-role key vive como variable de entorno; nunca
// se expone al cliente.
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SITE_URL = Deno.env.get("SITE_URL") ?? "";

    // --- 1) Verificar que el llamador sea admin/SGI ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Falta el token de autenticación." }, 401);
    }

    const clienteUsuario = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user: llamador },
    } = await clienteUsuario.auth.getUser();
    if (!llamador) {
      return json({ error: "Sesión no válida." }, 401);
    }

    const [
      { data: esSgiOAdmin, error: errSgi },
      { data: esSuperadmin, error: errSuperadmin },
    ] = await Promise.all([
      clienteUsuario.rpc("fn_usuario_es_sgi_o_admin"),
      clienteUsuario.rpc("fn_es_superadmin"),
    ]);
    if (errSgi || errSuperadmin || (!esSgiOAdmin && !esSuperadmin)) {
      return json(
        { error: "No tenés permisos para crear usuarios (requiere admin o SGI)." },
        403,
      );
    }

    // --- 2) Validar el cuerpo ---
    const body = await req.json().catch(() => ({}));
    const personaId: string | undefined = body.personaId;
    const username: string = (body.username ?? "").trim().toLowerCase();
    const email: string = (body.email ?? "").trim().toLowerCase();

    if (!personaId || !username || !email) {
      return json(
        { error: "Faltan datos: persona, username y email son obligatorios." },
        400,
      );
    }
    if (!/^[a-z0-9._-]{3,50}$/.test(username)) {
      return json(
        { error: "El username debe ser minúsculas, números, punto, guion o guion bajo (3 a 50)." },
        400,
      );
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --- 3) Verificar persona y que no tenga ya usuario ---
    const { data: persona, error: errPersona } = await admin
      .from("personas")
      .select("id, nombre, apellido")
      .eq("id", personaId)
      .is("eliminado_en", null)
      .maybeSingle();
    if (errPersona || !persona) {
      return json({ error: "La persona no existe o fue dada de baja." }, 400);
    }

    const { data: usuarioExistente } = await admin
      .from("usuarios")
      .select("id")
      .eq("persona_id", personaId)
      .maybeSingle();
    if (usuarioExistente) {
      return json({ error: "Esa persona ya tiene una cuenta de usuario." }, 409);
    }

    // --- 4) Invitar por email (crea la cuenta sin contraseña + manda mail) ---
    const redirectTo = SITE_URL ? `${SITE_URL}/auth/callback` : undefined;
    const { data: invitado, error: errInvite } = await admin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { nombre: persona.nombre, apellido: persona.apellido },
        redirectTo,
      },
    );

    if (errInvite || !invitado?.user) {
      const msg = (errInvite?.message ?? "").includes("already been registered")
        ? "Ya existe una cuenta con ese email."
        : `No se pudo invitar: ${errInvite?.message ?? "desconocido"}`;
      return json({ error: msg }, 400);
    }

    const authUserId = invitado.user.id;

    // --- 5) Vincular a la persona en public.usuarios ---
    const { error: errInsert } = await admin.from("usuarios").insert({
      auth_user_id: authUserId,
      persona_id: personaId,
      username,
    });

    if (errInsert) {
      // Rollback: borrar la cuenta de auth recién invitada.
      await admin.auth.admin.deleteUser(authUserId);
      const msg = errInsert.message.includes("usuarios_username_key")
        ? "Ese nombre de usuario ya está en uso."
        : `No se pudo crear el usuario: ${errInsert.message}`;
      return json({ error: msg }, 400);
    }

    // --- 6) Respaldo: generar el enlace de invitación por si el mail no llega ---
    let enlaceInvitacion: string | null = null;
    try {
      const { data: linkData } = await admin.auth.admin.generateLink({
        type: "invite",
        email,
        options: redirectTo ? { redirectTo } : undefined,
      });
      enlaceInvitacion = linkData?.properties?.action_link ?? null;
    } catch {
      // Si falla la generación del enlace, no es crítico: el mail ya se envió.
    }

    return json({
      ok: true,
      mensaje: `Invitación enviada a ${persona.nombre} ${persona.apellido}.`,
      email,
      username,
      enlaceInvitacion,
    });
  } catch (e) {
    return json({ error: `Error inesperado: ${(e as Error).message}` }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}