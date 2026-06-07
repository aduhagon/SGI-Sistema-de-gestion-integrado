import Link from "next/link";
import { UserCircle, ChevronLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function PersonaNoEncontrada() {
  return (
    <div className="mx-auto max-w-2xl p-6 sm:p-8 lg:p-12 mt-12 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-muted-foreground mb-6">
        <UserCircle className="h-6 w-6" />
      </div>
      <h1 className="font-serif text-3xl font-semibold tracking-tight mb-3">Persona no encontrada</h1>
      <Link href="/configuracion/personas" className={cn(buttonVariants({ variant: "default" }))}>
        <ChevronLeft className="h-4 w-4" />Ir a personas
      </Link>
    </div>
  );
}
