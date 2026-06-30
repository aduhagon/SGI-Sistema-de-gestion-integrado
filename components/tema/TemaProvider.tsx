import { resolverTemaActivo } from "@/lib/api/temas";
import { tokensACssString } from "@/lib/tema/default";

/**
 * Inyecta las variables CSS del tema activo del SGI.
 *
 * Es un Server Component: resuelve el tema en el servidor y emite un bloque
 * <style> que pisa los valores por defecto de globals.css en :root. Al correr
 * en el servidor, el tema correcto llega en el primer paint (sin flash).
 *
 * Colocar en el layout raíz de la app, lo más arriba posible:
 *
 *   <body>
 *     <TemaProvider />
 *     {children}
 *   </body>
 *
 * globals.css debe definir los mismos nombres de variables como fallback,
 * de modo que si esto no se renderiza, la app sigue con el tema de fábrica.
 */
export default async function TemaProvider() {
  const tema = await resolverTemaActivo();
  const css = `:root{${tokensACssString(tema.tokens)}}`;
  return <style id="sgi-tema-activo" dangerouslySetInnerHTML={{ __html: css }} />;
}
