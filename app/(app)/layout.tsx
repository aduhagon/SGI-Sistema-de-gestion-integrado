import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarMobileProvider } from "@/components/layout/SidebarMobileContext";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // El id público (usuarios.id) es distinto del auth.uid(); la campana de
  // notificaciones lo necesita para el filtro de Realtime.
  let usuarioId: string | null = null;
  const { data: filaUsuario } = await supabase
    .from("usuarios")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (filaUsuario) usuarioId = filaUsuario.id;

  // Superadmin: controla la visibilidad de "Configuración del sistema" en el
  // menú. La escritura igual está protegida en la base por las funciones.
  const { data: esSuperadmin } = await supabase.rpc("fn_es_superadmin");

  // Admin del SGI (admin, responsable del SGI o superadmin): controla la
  // visibilidad de reportes de administración como la matriz RACI.
  const [{ data: esAdmin }, { data: esResponsableSgi }] = await Promise.all([
    supabase.rpc("fn_usuario_es_admin"),
    supabase.rpc("fn_usuario_tiene_rol_global", { codigo_rol: "responsable_sgi" }),
  ]);
  const esAdminSgi = Boolean(esAdmin) || Boolean(esResponsableSgi) || Boolean(esSuperadmin);

  return (
    <SidebarMobileProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Header navy de ancho completo (incluye la marca y la hamburguesa) */}
        <TopBar userEmail={user.email ?? "—"} usuarioId={usuarioId} />

        {/* Fila inferior: sidebar claro + contenido */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar esSuperadmin={esSuperadmin ?? false} esAdminSgi={esAdminSgi} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarMobileProvider>
  );
}
