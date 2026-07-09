import { Suspense } from "react";
import {
  listarNodos, listarAristas, listarDataObjects, listarPuestos, calcularGaps,
} from "@/lib/api/flujogramas";
import { obtenerContextoLayout } from "@/lib/api/contexto-layout";
import { createClient } from "@/lib/supabase/server";
import { FlujogramasVista } from "@/components/flujogramas/FlujogramasVista";
import { TableroGaps } from "@/components/flujogramas/TableroGaps";

export const dynamic = "force-dynamic";

async function listarProcesosSgi(): Promise<{ id: string; nombre: string }[]> {
  const sb = createClient();
  const { data, error } = await sb.from("procesos").select("id,nombre").order("nombre", { ascending: true });
  if (error) return [];
  return (data ?? []).map((r: { id: string; nombre: string }) => ({ id: r.id, nombre: r.nombre }));
}

export default async function FlujogramasPage({ searchParams }: { searchParams: { proceso?: string } }) {
  const procesoInicial = searchParams?.proceso ?? null;
  const [nodos, aristas, dataObjects, puestos, { esAdminSgi }, procesosSgi] = await Promise.all([
    listarNodos(),
    listarAristas(),
    listarDataObjects(),
    listarPuestos(),
    obtenerContextoLayout(),
    listarProcesosSgi(),
  ]);
  const gaps = calcularGaps(nodos);

  const procesos = nodos.filter((n) => n.nivel === "proceso").length;
  const pasos = nodos.filter((n) => n.nivel === "paso").length;
  const rojos = gaps.filter((g) => g.estado === "rojo").length;

  return (
    <div className="mx-auto max-w-6xl p-6 sm:p-8 lg:p-10">
      <header className="mb-8">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">SGI · Flujogramas de proceso</p>
        <h1 className="mb-3 font-serif text-4xl font-semibold tracking-tight">Mapa operativo de procesos</h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Navegación multinivel de los procesos de MSU con detección de gaps de control.
          El flujograma cruza el flujo con los riesgos y controles declarados para exponer
          dónde el proceso real no está bajo control.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium">{procesos} procesos · {pasos} pasos</span>
          {rojos > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 font-medium text-red-700">
              {rojos} subproceso{rojos !== 1 ? "s" : ""} con riesgo sin control
            </span>
          )}
          {esAdminSgi && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 font-medium text-blue-700">
              Modo edición activo
            </span>
          )}
        </div>
      </header>

      <div className="mb-8">
        <TableroGaps gaps={gaps} />
      </div>

      <Suspense fallback={null}>
        <FlujogramasVista
          nodos={nodos} aristas={aristas} dataObjects={dataObjects} puestos={puestos} gaps={gaps}
          esAdminSgi={esAdminSgi} procesosSgi={procesosSgi} procesoInicial={procesoInicial}
        />
      </Suspense>
    </div>
  );
}
