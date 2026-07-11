import { GuardiaModulo } from "@/components/sistema/GuardiaModulo";

/**
 * Gating a nivel de ruta: si el módulo "auditorias" está deshabilitado en
 * Configuración del sistema, este layout corta el acceso a /auditorias y a todas
 * sus subrutas (el superadmin conserva acceso con un banner de aviso).
 */
export default function AuditoriasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuardiaModulo codigo="auditorias" nombre="Auditorías">
      {children}
    </GuardiaModulo>
  );
}
