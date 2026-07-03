import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerContextoLayout } from "@/lib/api/contexto-layout";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { SidebarMobileProvider } from "@/components/layout/SidebarMobileContext";
import TemaProvider from "@/components/tema/TemaProvider";

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

  // Un único round-trip a la base: id público del usuario (la campana de
  // notificaciones lo necesita para el filtro de Realtime), superadmin
  // (visibilidad de "Configuración del sistema"), admin del SGI (reportes de
  // administración como la matriz RACI) y módulos habilitados para el menú.
  // La escritura igual está protegida en la base por las funciones.
  const { usuarioId, esSuperadmin, esAdminSgi, modulosHabilitados } =
    await obtenerContextoLayout();

  return (
    <SidebarMobileProvider>
      <div className="flex h-screen flex-col bg-background">
        {/* Inyecta las variables CSS del tema visual activo (paleta, barra, forma).
            Va primero para que todo lo que renderiza el layout herede el tema. */}
        <TemaProvider />

        {/* Header navy de ancho completo (incluye la marca y la hamburguesa) */}
        <TopBar userEmail={user.email ?? "—"} usuarioId={usuarioId} />

        {/* Fila inferior: sidebar claro + contenido */}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar esSuperadmin={esSuperadmin} esAdminSgi={esAdminSgi} modulosHabilitados={modulosHabilitados} />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </SidebarMobileProvider>
  );
}
