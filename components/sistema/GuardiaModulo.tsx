import Link from "next/link";
import { PowerOff, Eye } from "lucide-react";
import { obtenerContextoLayout } from "@/lib/api/contexto-layout";

/**
 * Guardián de módulos a nivel de ruta.
 *
 * Hasta ahora, deshabilitar un módulo en Configuración del sistema solo lo
 * ocultaba del menú lateral: la URL directa y los links internos (dashboard,
 * Mis pendientes, links entre módulos) seguían dando acceso completo.
 *
 * Este componente se monta en el layout.tsx de cada módulo apagable y corta
 * el acceso a TODA la rama de rutas de una vez:
 *   - Módulo habilitado → renderiza el contenido normalmente.
 *   - Módulo deshabilitado + superadmin → renderiza el contenido con un
 *     banner de aviso (puede configurar el módulo antes de encenderlo).
 *   - Módulo deshabilitado + cualquier otro usuario → pantalla informativa,
 *     sin acceso al contenido.
 *
 * Costo: cero round-trips extra. Reusa obtenerContextoLayout(), que ya está
 * envuelto en React cache() y fue invocado por el layout de la app en el
 * mismo request.
 *
 * Fail-closed: si fn_contexto_layout falla, modulosHabilitados llega vacío y
 * el módulo se muestra como deshabilitado (mismo criterio conservador que el
 * menú lateral).
 */
export async function GuardiaModulo({
  codigo,
  nombre,
  children,
}: {
  /** Código del módulo en modulos_sistema (ej: "riesgos", "no_conformidades"). */
  codigo: string;
  /** Nombre visible del módulo para la pantalla informativa. */
  nombre: string;
  children: React.ReactNode;
}) {
  const { esSuperadmin, modulosHabilitados } = await obtenerContextoLayout();

  if (modulosHabilitados.includes(codigo)) {
    return <>{children}</>;
  }

  if (esSuperadmin) {
    return (
      <>
        <div className="flex items-start gap-3 border-b border-amber-300 bg-amber-50 px-6 py-3 text-amber-900">
          <Eye className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="text-sm">
            <span className="font-medium">
              El módulo {nombre} está deshabilitado.
            </span>{" "}
            Lo estás viendo porque sos superadministrador; el resto de los
            usuarios no puede acceder. Podés activarlo desde{" "}
            <Link href="/sistema" className="underline underline-offset-2">
              Configuración del sistema
            </Link>
            .
          </p>
        </div>
        {children}
      </>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-10">
      <div className="rounded-lg border border-border bg-card p-8 text-center">
        <PowerOff
          className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="font-medium">Módulo deshabilitado</p>
        <p className="mt-1 text-sm text-muted-foreground">
          El módulo {nombre} está deshabilitado en este momento. Si creés que
          deberías tener acceso, contactá al administrador del SGI.
        </p>
        <Link
          href="/dashboard"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
