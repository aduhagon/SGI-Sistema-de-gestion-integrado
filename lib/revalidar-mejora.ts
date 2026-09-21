import { revalidatePath } from "next/cache";

export function revalidarMejora(ncId: string) {
  revalidatePath(`/ncs/${ncId}`);
  revalidatePath("/ncs");
  revalidatePath("/mis-pendientes");
  revalidatePath("/dashboard");
  revalidatePath("/procesos/[codigo]", "page");
  revalidatePath("/controles/[id]/ejecuciones", "page");
  revalidatePath("/auditorias/[id]", "page");
}
