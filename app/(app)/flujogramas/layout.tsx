import { GuardiaModulo } from "@/components/sistema/GuardiaModulo";

/**
 * Gating a nivel de ruta: si el módulo "flujogramas" está deshabilitado en
 * Configuración del sistema, este layout corta el acceso a /flujogramas y a todas
 * sus subrutas (el superadmin conserva acceso con un banner de aviso).
 */
export default function FlujogramasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuardiaModulo codigo="flujogramas" nombre="Flujogramas">
      {children}
    </GuardiaModulo>
  );
}
