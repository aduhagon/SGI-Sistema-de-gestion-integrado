"use client";

import Link from "next/link";
import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  FileText,
  AlertOctagon,
  Gauge,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import type { ProcesoCalor, EstadoSenal } from "@/lib/api/mapaCalor";

// ---------------------------------------------------------------------------
// Estilos por estado.
// Los colores de las celdas del heatmap son tonos semánticos fijos (no varían
// con el tema): un estado "rojo" debe verse rojo siempre. El resto del chrome
// (textos, bordes, fondos) usa las clases semánticas del proyecto.
// ---------------------------------------------------------------------------

const PUNTO: Record<EstadoSenal, string> = {
  verde: "bg-emerald-500",
  amarillo: "bg-amber-500",
  rojo: "bg-rose-500",
  gris: "bg-muted-foreground/40",
};

// Relleno de la celda del heatmap (tono pastel calibrado).
const CELDA_FILL: Record<EstadoSenal, string> = {
  verde: "#D6EFE6",
  amarillo: "#FBE6C8",
  rojo: "#FAD9D9",
  gris: "#E9E7DF",
};

const RESUMEN: Record<EstadoSenal, { label: string; dot: string }> = {
  rojo: { label: "Críticos", dot: "bg-rose-500" },
  amarillo: { label: "Atención", dot: "bg-amber-500" },
  verde: { label: "En control", dot: "bg-emerald-500" },
  gris: { label: "Sin datos", dot: "bg-muted-foreground/40" },
};

// Chip de tipo de proceso. Colores planos por categoría (claro + oscuro del mismo ramp).
const TIPO_CHIP: Record<string, { label: string; bg: string; tx: string }> = {
  estrategico: { label: "Estratégico", bg: "#EEEDFE", tx: "#3C3489" },
  operativo: { label: "Operativo", bg: "#E6F1FB", tx: "#0C447C" },
  apoyo: { label: "Apoyo", bg: "#E1F5EE", tx: "#085041" },
};

// Orden de criticidad: lo que arde primero, lo gris al final.
const ORDEN_CRITICIDAD: Record<EstadoSenal, number> = {
  rojo: 0,
  amarillo: 1,
  verde: 2,
  gris: 3,
};

// ---------------------------------------------------------------------------

function Celda({ estado, detalle }: { estado: EstadoSenal; detalle: string }) {
  const [hover, setHover] = useState(false);
  return (
    <td className="px-1 py-1.5">
      <div className="relative flex justify-center">
        <span
          className="inline-block h-[30px] w-[30px] rounded-[7px]"
          style={{ backgroundColor: CELDA_FILL[estado] }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          aria-label={detalle}
        />
        {hover && (
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1.5 text-[11px] font-normal leading-snug text-background shadow-sm"
          >
            {detalle}
          </span>
        )}
      </div>
    </td>
  );
}

function FilaProceso({ p, ultima }: { p: ProcesoCalor; ultima: boolean }) {
  const chip = TIPO_CHIP[p.tipo] ?? null;
  return (
    <tr
      className={
        "group transition-colors hover:bg-muted/40 " +
        (ultima ? "" : "border-b border-border")
      }
    >
      <td className="px-3.5 py-2.5">
        <Link
          href={`/procesos/${encodeURIComponent(p.codigo)}`}
          className="flex min-w-0 items-center gap-2.5"
        >
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${PUNTO[p.colorGlobal]}`}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-foreground group-hover:underline">
              {p.nombre}
            </span>
            <span className="mt-0.5 flex items-center gap-2">
              <span className="font-mono text-[10px] text-muted-foreground/80">
                {p.codigo}
              </span>
              {chip && (
                <span
                  className="rounded-[5px] px-1.5 py-px text-[10px] font-medium"
                  style={{ backgroundColor: chip.bg, color: chip.tx }}
                >
                  {chip.label}
                </span>
              )}
            </span>
          </span>
        </Link>
      </td>

      <Celda estado={p.nc.estado} detalle={p.nc.detalle} />
      <Celda estado={p.doc.estado} detalle={p.doc.detalle} />
      <Celda estado={p.ind.estado} detalle={p.ind.detalle} />
      <Celda estado={p.riesgo.estado} detalle={p.riesgo.detalle} />

      <td className="px-1 py-2.5 text-center">
        <Link
          href={`/procesos/${encodeURIComponent(p.codigo)}`}
          aria-label={`Ver proceso ${p.nombre}`}
          className="inline-flex"
        >
          <ArrowRight className="h-4 w-4 text-muted-foreground/70 transition-colors group-hover:text-foreground" />
        </Link>
      </td>
    </tr>
  );
}

function ResumenChip({ estado, valor }: { estado: EstadoSenal; valor: number }) {
  const r = RESUMEN[estado];
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${r.dot}`} />
      <span className="font-serif text-lg font-semibold">{valor}</span>
      <span className="text-xs text-muted-foreground">{r.label}</span>
    </div>
  );
}

// Encabezado de columna con su ícono de señal.
function ThSenal({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <th className="px-1 py-2.5 font-medium text-muted-foreground">
      <span className="flex items-center justify-center gap-1.5">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="text-xs">{children}</span>
      </span>
    </th>
  );
}

export function MapaCalor({ procesos }: { procesos: ProcesoCalor[] }) {
  // Resumen por color para los chips superiores.
  const resumen = useMemo(() => {
    const r = { verde: 0, amarillo: 0, rojo: 0, gris: 0 } as Record<
      EstadoSenal,
      number
    >;
    for (const p of procesos) r[p.colorGlobal]++;
    return r;
  }, [procesos]);

  // Una sola tabla, ordenada por criticidad (rojo → amarillo → verde → gris).
  // Empate: alfabético por nombre para un orden estable.
  const ordenados = useMemo(() => {
    return [...procesos].sort((a, b) => {
      const d = ORDEN_CRITICIDAD[a.colorGlobal] - ORDEN_CRITICIDAD[b.colorGlobal];
      if (d !== 0) return d;
      return a.nombre.localeCompare(b.nombre, "es");
    });
  }, [procesos]);

  return (
    <div>
      {/* Resumen por color */}
      <div className="mb-5 flex flex-wrap gap-2">
        <ResumenChip estado="rojo" valor={resumen.rojo} />
        <ResumenChip estado="amarillo" valor={resumen.amarillo} />
        <ResumenChip estado="verde" valor={resumen.verde} />
        <ResumenChip estado="gris" valor={resumen.gris} />
      </div>

      {/* Matriz de calor */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col style={{ width: "40%" }} />
            <col />
            <col />
            <col />
            <col />
            <col style={{ width: "6%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border text-left">
              <th className="px-3.5 py-2.5 font-medium text-muted-foreground">
                <span className="text-xs">Proceso</span>
              </th>
              <ThSenal icon={AlertOctagon}>No conf.</ThSenal>
              <ThSenal icon={FileText}>Docs</ThSenal>
              <ThSenal icon={Gauge}>Indic.</ThSenal>
              <ThSenal icon={ShieldAlert}>Riesgos</ThSenal>
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {ordenados.map((p, i) => (
              <FilaProceso
                key={p.procesoId}
                p={p}
                ultima={i === ordenados.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground/80">
        Cada celda muestra el peor estado de esa señal. Pasá el cursor sobre una
        celda para ver el detalle.
      </p>
    </div>
  );
}
