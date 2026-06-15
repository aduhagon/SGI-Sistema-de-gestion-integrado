"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FileText, AlertOctagon, Gauge, ShieldAlert, ArrowRight } from "lucide-react";
import type { ProcesoCalor, EstadoSenal } from "@/lib/api/mapaCalor";

// Estilos por estado. 'gris' = sin datos (no evaluable).
const ESTILO: Record<EstadoSenal, { card: string; punto: string; texto: string; etiqueta: string }> = {
  verde: {
    card: "border-emerald-200 bg-emerald-50/40",
    punto: "bg-emerald-500",
    texto: "text-emerald-700",
    etiqueta: "En control",
  },
  amarillo: {
    card: "border-amber-200 bg-amber-50/50",
    punto: "bg-amber-500",
    texto: "text-amber-700",
    etiqueta: "Requiere atención",
  },
  rojo: {
    card: "border-rose-200 bg-rose-50/50",
    punto: "bg-rose-500",
    texto: "text-rose-700",
    etiqueta: "Crítico",
  },
  gris: {
    card: "border-border bg-muted/30",
    punto: "bg-muted-foreground/40",
    texto: "text-muted-foreground",
    etiqueta: "Sin datos",
  },
};

const TIPO_LABEL: Record<string, string> = {
  estrategico: "Procesos estratégicos",
  operativo: "Procesos operativos",
  apoyo: "Procesos de apoyo",
};
const TIPO_ORDEN = ["estrategico", "operativo", "apoyo"];

function Punto({ estado }: { estado: EstadoSenal }) {
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${ESTILO[estado].punto}`} />;
}

function Senal({
  icon: Icon,
  label,
  estado,
  detalle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  estado: EstadoSenal;
  detalle: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-20 shrink-0">{label}</span>
      <Punto estado={estado} />
      <span className={`text-xs ${ESTILO[estado].texto} truncate`}>{detalle}</span>
    </div>
  );
}

function TarjetaProceso({ p }: { p: ProcesoCalor }) {
  const e = ESTILO[p.colorGlobal];
  return (
    <Link
      href={`/procesos/${p.procesoId}`}
      className={`group block rounded-lg border p-4 transition-all hover:shadow-sm ${e.card}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{p.codigo}</div>
          <div className="font-serif text-base font-semibold leading-tight tracking-tight truncate">{p.nombre}</div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`h-2.5 w-2.5 rounded-full ${e.punto}`} />
        </div>
      </div>

      <div className={`mb-3 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${e.texto} bg-background/60`}>
        {e.etiqueta}
      </div>

      <div className="space-y-1.5">
        <Senal icon={AlertOctagon} label="No conf." estado={p.nc.estado} detalle={p.nc.detalle} />
        <Senal icon={FileText} label="Documentos" estado={p.doc.estado} detalle={p.doc.detalle} />
        <Senal icon={Gauge} label="Indicadores" estado={p.ind.estado} detalle={p.ind.detalle} />
        <Senal icon={ShieldAlert} label="Riesgos" estado={p.riesgo.estado} detalle={p.riesgo.detalle} />
      </div>

      <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        Ver proceso <ArrowRight className="h-3 w-3" />
      </div>
    </Link>
  );
}

export function MapaCalor({ procesos }: { procesos: ProcesoCalor[] }) {
  const grupos = useMemo(() => {
    return TIPO_ORDEN.map((tipo) => ({
      tipo,
      label: TIPO_LABEL[tipo] ?? tipo,
      procesos: procesos.filter((p) => p.tipo === tipo),
    })).filter((g) => g.procesos.length > 0);
  }, [procesos]);

  // Resumen por color para el encabezado.
  const resumen = useMemo(() => {
    const r = { verde: 0, amarillo: 0, rojo: 0, gris: 0 } as Record<EstadoSenal, number>;
    for (const p of procesos) r[p.colorGlobal]++;
    return r;
  }, [procesos]);

  return (
    <div>
      {/* Resumen */}
      <div className="mb-8 flex flex-wrap gap-3">
        <ResumenChip estado="rojo" label="Críticos" valor={resumen.rojo} />
        <ResumenChip estado="amarillo" label="Atención" valor={resumen.amarillo} />
        <ResumenChip estado="verde" label="En control" valor={resumen.verde} />
        <ResumenChip estado="gris" label="Sin datos" valor={resumen.gris} />
      </div>

      <div className="space-y-8">
        {grupos.map((g) => (
          <section key={g.tipo}>
            <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground">{g.label}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.procesos.map((p) => (
                <TarjetaProceso key={p.procesoId} p={p} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ResumenChip({ estado, label, valor }: { estado: EstadoSenal; label: string; valor: number }) {
  const e = ESTILO[estado];
  return (
    <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${e.card}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${e.punto}`} />
      <span className="font-serif text-xl font-semibold">{valor}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
