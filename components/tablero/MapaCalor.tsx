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
// Colores de estado (semánticos fijos: un "rojo" debe verse rojo en claro y
// oscuro). El resto del chrome usa las clases del tema.
// ---------------------------------------------------------------------------

const COLOR: Record<EstadoSenal, string> = {
  verde: "#1D9E75",
  amarillo: "#EF9F27",
  rojo: "#E24B4A",
  gris: "#B4B2A9",
};

const RESUMEN: Record<EstadoSenal, { label: string }> = {
  rojo: { label: "Críticos" },
  amarillo: { label: "Atención" },
  verde: { label: "En control" },
  gris: { label: "Sin datos" },
};

// Chip de tipo de proceso (colores planos por categoría).
const TIPO_CHIP: Record<string, { label: string; bg: string; tx: string }> = {
  estrategico: { label: "Estratégico", bg: "#EEEDFE", tx: "#3C3489" },
  operativo: { label: "Operativo", bg: "#E6F1FB", tx: "#0C447C" },
  apoyo: { label: "Apoyo", bg: "#E1F5EE", tx: "#085041" },
};

// ---------------------------------------------------------------------------
// Foco semáforo: círculo con brillo (halo + reflejo interno).
// 'gris' (sin datos) queda apagado: hueco, sin glow, para que no compita
// visualmente con los procesos que sí tienen señal.
// ---------------------------------------------------------------------------

function Foco({ estado, size = 14 }: { estado: EstadoSenal; size?: number }) {
  const c = COLOR[estado];
  const apagado = estado === "gris";
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        backgroundColor: apagado ? "#D3D1C7" : c,
        border: apagado ? "0.5px solid #B4B2A9" : "none",
        boxShadow: apagado
          ? "none"
          : `0 0 6px 1px ${c}99, inset 0 1px 1px #ffffff66`,
      }}
    />
  );
}

function Celda({ estado, detalle }: { estado: EstadoSenal; detalle: string }) {
  const [hover, setHover] = useState(false);
  return (
    <td className="px-1 py-2.5">
      <div
        className="relative flex justify-center"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <Foco estado={estado} />
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
          <Foco estado={p.colorGlobal} />
          <span className="truncate font-medium text-foreground group-hover:underline">
            {p.nombre}
          </span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
            {p.codigo}
          </span>
          {chip && (
            <span
              className="shrink-0 rounded-[5px] px-1.5 py-px text-[10px] font-medium"
              style={{ backgroundColor: chip.bg, color: chip.tx }}
            >
              {chip.label}
            </span>
          )}
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
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5">
      <Foco estado={estado} size={9} />
      <span className="font-serif text-lg font-semibold">{valor}</span>
      <span className="text-xs text-muted-foreground">{RESUMEN[estado].label}</span>
    </div>
  );
}

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

  // Se respeta el orden de llegada de la base (fn_mapa_calor_procesos).
  // No se re-ordena ni se agrupa.

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
            <col style={{ width: "42%" }} />
            <col />
            <col />
            <col />
            <col />
            <col style={{ width: "5%" }} />
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
            {procesos.map((p, i) => (
              <FilaProceso
                key={p.procesoId}
                p={p}
                ultima={i === procesos.length - 1}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2.5 text-xs text-muted-foreground/80">
        Pasá el cursor sobre un círculo para ver el detalle de esa señal.
      </p>
    </div>
  );
}
