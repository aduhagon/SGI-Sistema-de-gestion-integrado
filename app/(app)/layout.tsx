import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userEmail={user.email ?? "—"} usuarioId={usuarioId} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
