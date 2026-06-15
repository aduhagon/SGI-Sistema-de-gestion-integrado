import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/layout/SidebarNav";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarMobileProvider } from "@/components/layout/SidebarMobileContext";
import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";

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

  // Perfil de menú (roles, flags y módulos habilitados) derivado del RPC
  // fn_perfil_menu_usuario(). Define qué ítems del sidebar ve el usuario.
  const perfil = await obtenerPerfilMenu();

  return (
    <SidebarMobileProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Header navy de ancho completo (incluye la marca y la hamburguesa) */}
        <TopBar userEmail={user.email ?? "—"} usuarioId={usuarioId} />

        {/* Fila inferior: sidebar azul + contenido */}
        <div className="flex flex-1 overflow-hidden">
          <SidebarNav perfil={perfil} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarMobileProvider>
  );
}
