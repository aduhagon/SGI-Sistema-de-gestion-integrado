import { GuardiaModulo } from "@/components/sistema/GuardiaModulo";

/**
 * Gating a nivel de ruta: si el módulo "indicadores" está deshabilitado en
 * Configuración del sistema, este layout corta el acceso a /indicadores y a todas
 * sus subrutas (el superadmin conserva acceso con un banner de aviso).
 */
export default function IndicadoresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuardiaModulo codigo="indicadores" nombre="Indicadores">
      {children}
    </GuardiaModulo>
  );
}
