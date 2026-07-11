import { GuardiaModulo } from "@/components/sistema/GuardiaModulo";

/**
 * Gating a nivel de ruta: si el módulo "cumplimiento" está deshabilitado en
 * Configuración del sistema, este layout corta el acceso a /cumplimiento y a todas
 * sus subrutas (el superadmin conserva acceso con un banner de aviso).
 */
export default function CumplimientoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuardiaModulo codigo="cumplimiento" nombre="Cumplimiento">
      {children}
    </GuardiaModulo>
  );
}
