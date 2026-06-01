import { cn } from "@/lib/utils";

type Estado =
  | "borrador"
  | "confeccionado"
  | "pendiente_aprobacion"
  | "aprobado"
  | "rechazado"
  | "obsoleto";

const ESTADO_CONFIG: Record<
  Estado,
  { label: string; bg: string; ring: string; tooltip: string }
> = {
  borrador: {
    label: "Borrador",
    bg: "bg-stone-400",
    ring: "ring-stone-300",
    tooltip: "En elaboración inicial",
  },
  confeccionado: {
    label: "Confeccionado",
    bg: "bg-blue-400",
    ring: "ring-blue-200",
    tooltip: "Confeccionado, listo para enviar a aprobación",
  },
  pendiente_aprobacion: {
    label: "Pendiente aprobación",
    bg: "bg-amber-400",
    ring: "ring-amber-200",
    tooltip: "Esperando aprobación N1 o N2",
  },
  aprobado: {
    label: "Aprobado",
    bg: "bg-emerald-500",
    ring: "ring-emerald-200",
    tooltip: "Aprobado y vigente",
  },
  rechazado: {
    label: "Rechazado",
    bg: "bg-rose-500",
    ring: "ring-rose-200",
    tooltip: "Rechazado en aprobación, requiere correcciones",
  },
  obsoleto: {
    label: "Obsoleto",
    bg: "bg-stone-300",
    ring: "ring-stone-200",
    tooltip: "Reemplazado por una versión más nueva",
  },
};

type Props = {
  estado: string;
  showLabel?: boolean;
  className?: string;
};

/**
 * Indicador de estado del documento.
 *
 * - Solo dot: para listados densos
 * - Dot + label: para vistas con espacio (header de detalle, etc.)
 */
export function StatusDot({ estado, showLabel = false, className }: Props) {
  const config = ESTADO_CONFIG[estado as Estado] ?? ESTADO_CONFIG.borrador;

  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      title={config.tooltip}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-2 w-2 rounded-full ring-2",
          config.bg,
          config.ring,
        )}
      />
      {showLabel && (
        <span className="text-xs font-medium text-foreground">
          {config.label}
        </span>
      )}
      <span className="sr-only">Estado: {config.label}</span>
    </span>
  );
}

export function getEstadoLabel(estado: string): string {
  return ESTADO_CONFIG[estado as Estado]?.label ?? estado;
}
