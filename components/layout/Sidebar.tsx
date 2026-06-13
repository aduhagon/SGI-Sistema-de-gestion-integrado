import { obtenerPerfilMenu } from "@/lib/api/perfil-menu";
import { SidebarNav } from "@/components/layout/SidebarNav";

/**
 * Server component: obtiene el perfil de menú del usuario (roles + flags) y lo
 * pasa al SidebarNav, que hace el render y el resaltado del item activo.
 *
 * El layout (app/(app)/layout.tsx) ya es async server y monta <Sidebar /> sin
 * props, así que no hay que tocarlo.
 */
export async function Sidebar() {
  const perfil = await obtenerPerfilMenu();
  return <SidebarNav perfil={perfil} />;
}
