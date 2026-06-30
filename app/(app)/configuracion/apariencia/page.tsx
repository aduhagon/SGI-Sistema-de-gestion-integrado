import { listarTemas, obtenerTemaActivoId } from "@/lib/api/temas";
import GestionApariencia from "@/components/configuracion/GestionApariencia";

export const metadata = {
  title: "Apariencia · SGI",
};

export default async function AparienciaPage() {
  const temas = await listarTemas();
  const activoId = (await obtenerTemaActivoId()) ?? "default";

  return (
    <div className="p-6 max-w-[1300px] mx-auto">
      <header className="mb-5 pb-4 border-b">
        <p className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground font-semibold mb-1.5">
          SGI Multinorma · Configuración
        </p>
        <h1 className="text-2xl font-serif font-bold tracking-tight text-foreground">
          Apariencia{" "}
          <span className="font-normal text-muted-foreground">
            — identidad visual del sistema
          </span>
        </h1>
      </header>

      <GestionApariencia temas={temas} activoIdInicial={activoId} />
    </div>
  );
}
