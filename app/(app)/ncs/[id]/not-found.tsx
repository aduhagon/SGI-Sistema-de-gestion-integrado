import Link from "next/link";
import { AlertOctagon, ChevronLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NCNoEncontrada() {
  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-12 mt-12 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-6">
        <AlertOctagon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h1 className="font-serif text-3xl font-semibold tracking-tight mb-3">No conformidad no encontrada</h1>
      <p className="text-base text-muted-foreground leading-relaxed mb-8 max-w-md mx-auto">
        El identificador no corresponde a ninguna no conformidad, o fue eliminada.
      </p>
      <Link href="/ncs" className={cn(buttonVariants({ variant: "default" }))}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />Ir a no conformidades
      </Link>
    </div>
  );
}
