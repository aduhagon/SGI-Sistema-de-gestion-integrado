import { GuardiaModulo } from "@/components/sistema/GuardiaModulo";

/**
 * Gating a nivel de ruta: si el módulo "riesgos" está deshabilitado en
 * Configuración del sistema, este layout corta el acceso a /riesgos y a todas
 * sus subrutas (el superadmin conserva acceso con un banner de aviso).
 */
export default function RiesgosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuardiaModulo codigo="riesgos" nombre="Riesgos">
      {children}
    </GuardiaModulo>
  );
}
