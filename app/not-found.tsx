import Link from "next/link";
import { FileQuestion } from "lucide-react";

// Página 404. Next la muestra para rutas inexistentes y cuando un
// Server Component llama a notFound() (por ejemplo, un detalle cuyo id
// no existe). Vive en la raíz para cubrir toda la app.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
      <FileQuestion className="mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
      <h1 className="mb-2 font-serif text-2xl font-semibold tracking-tight text-foreground">
        No encontramos esta página
      </h1>
      <p className="mb-6 max-w-md text-sm leading-relaxed text-muted-foreground">
        El enlace puede estar desactualizado o el registro que buscás ya no
        existe. Volvé al inicio para seguir.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Ir al inicio
      </Link>
    </div>
  );
}
