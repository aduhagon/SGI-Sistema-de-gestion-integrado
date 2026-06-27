"use server";

import { obtenerPerfilRaci, type PerfilRaci } from "@/lib/api/perfil-persona";

export async function cargarPerfilRaci(personaId: string): Promise<PerfilRaci> {
  return obtenerPerfilRaci(personaId);
}
