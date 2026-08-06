import {
  buscarFragmentos,
  obtenerFragmentosPorRequisito,
  type FragmentoPorRequisito,
  type ResultadoBusquedaFragmento,
} from "@/lib/api/referencias";
import { obtenerNormasConRequisitos } from "@/lib/api/matriz";
import { obtenerRequisitosDeNorma, type RequisitoOpcion } from "@/lib/api/coberturas";
import { BuscadorNormativo } from "@/components/referencias/BuscadorNormativo";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: { q?: string; requisito?: string; norma?: string };
};

export default async function BusquedaNormativaPage({ searchParams }: Props) {
  const normas = await obtenerNormasConRequisitos();

  const requisitosPorNorma: Record<string, RequisitoOpcion[]> = {};
  for (const n of normas) {
    requisitosPorNorma[n.versionNormaId] = await obtenerRequisitosDeNorma(
      n.versionNormaId,
    );
  }

  let resultadosTexto: ResultadoBusquedaFragmento[] = [];
  let resultadosRequisito: FragmentoPorRequisito[] = [];

  if (searchParams.requisito) {
    resultadosRequisito = await obtenerFragmentosPorRequisito(
      searchParams.requisito,
    );
  } else if (searchParams.q && searchParams.q.trim().length >= 2) {
    resultadosTexto = await buscarFragmentos(searchParams.q);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-lg font-semibold">Búsqueda normativa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Busca dentro del texto de los procedimientos vigentes, bloque por
          bloque, o mira qué bloques responden a cada requisito de las normas.
        </p>
      </div>

      <BuscadorNormativo
        normas={normas}
        requisitosPorNorma={requisitosPorNorma}
        resultadosTexto={resultadosTexto}
        resultadosRequisito={resultadosRequisito}
      />
    </div>
  );
}
