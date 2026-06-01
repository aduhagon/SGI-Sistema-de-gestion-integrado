import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

/**
 * Layout para todas las rutas autenticadas.
 *
 * Server Component que valida la sesión server-side antes de renderizar
 * cualquier hijo. Si no hay sesión, redirige a /login.
 * (El middleware también lo hace, esto es una defensa en profundidad).
 */
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

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userEmail={user.email ?? "—"} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
