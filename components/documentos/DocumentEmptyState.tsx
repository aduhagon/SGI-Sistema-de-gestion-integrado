import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  hrefAction?: string;
  labelAction?: string;
  titulo?: string;
  descripcion?: string;
};

/**
 * Empty state mostrado cuando no hay documentos para listar.
 */
export function DocumentEmptyState({
  hrefAction = "/documentos/nuevo",
  labelAction = "Cargar primer documento",
  titulo = "Todavía no hay documentos cargados",
  descripcion = "Empezá cargando tu primer documento al SGI. Una política integrada, un manual, un procedimiento — lo que sea más representativo para arrancar.",
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-6">
        <FileText className="h-6 w-6" aria-hidden="true" />
      </div>

      <h2 className="font-serif text-2xl font-semibold tracking-tight mb-3 text-foreground">
        {titulo}
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-md mb-8">
        {descripcion}
      </p>

      <Link href={hrefAction} className={cn(buttonVariants({ variant: "default" }))}>
        <Plus className="h-4 w-4" aria-hidden="true" />
        {labelAction}
      </Link>
    </div>
  );
}
