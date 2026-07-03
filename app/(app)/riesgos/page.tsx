import { Suspense } from "react";
import {
  listarRiesgos, obtenerDatosFormRiesgo, obtenerArbolRiesgos,
  listarMitigantesPorRiesgo, obtenerOpcionesMitigantes, listarNormasPorRiesgo,
} from "@/lib/api/riesgos";
import { RiesgosVista } from "@/components/riesgos/RiesgosVista";

export const dynamic = "force-dynamic";

export default async function RiesgosPage() {
  const [riesgos, { procesos, puestos, normas }, arbol, mitigantesPorRiesgo, opcionesMitigantes, normasPorRiesgo] = await Promise.all([
    listarRiesgos(),
    obtenerDatosFormRiesgo(),
    obtenerArbolRiesgos(),
    listarMitigantesPorRiesgo(),
    obtenerOpcionesMitigantes(),
    listarNormasPorRiesgo(),
  ]);

  const extremos = riesgos.filter((r) => r.nivel === "extremo").length;
  const altos = riesgos.filter((r) => r.nivel === "alto").length;

  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">SGI · Riesgos y oportunidades</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Riesgos por proceso</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Identificación, evaluación y tratamiento de riesgos y oportunidades de cada proceso,
          según ISO 9001 cláusula 6.1. Cada riesgo se evalúa por probabilidad e impacto.
        </p>
        {(extremos > 0 || altos > 0) && (
          <div className="mt-4 flex gap-3 text-sm">
            {extremos > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">{extremos} extremo{extremos !== 1 ? "s" : ""}</span>}
            {altos > 0 && <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700">{altos} alto{altos !== 1 ? "s" : ""}</span>}
          </div>
        )}
      </header>
      <Suspense fallback={null}>
        <RiesgosVista riesgos={riesgos} procesos={procesos} puestos={puestos} arbol={arbol} mitigantesPorRiesgo={mitigantesPorRiesgo} documentosOpc={opcionesMitigantes.documentos} indicadoresOpc={opcionesMitigantes.indicadores} normasOpc={normas} normasPorRiesgo={normasPorRiesgo} />
      </Suspense>
    </div>
  );
}
