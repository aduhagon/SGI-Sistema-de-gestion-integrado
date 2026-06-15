"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, CheckCheck, FileText, ClipboardCheck, AlertTriangle, Calendar, Info, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  marcarNotificacionLeida,
  marcarTodasLeidas,
} from "@/app/(app)/notificaciones/actions";

type Notif = {
  id: string;
  tipo: string;
  prioridad: string;
  titulo: string;
  mensaje: string;
  url_destino: string | null;
  leida_en: string | null;
  fecha_envio: string;
};

const ICONO_POR_TIPO: Record<string, any> = {
  documento_aprobado: FileText,
  documento_modificado: FileText,
  documento_obsoleto: FileText,
  aprobacion_pendiente: ClipboardCheck,
  acuse_pendiente: ClipboardCheck,
  nc_asignada: AlertTriangle,
  accion_asignada: AlertTriangle,
  accion_vencida: AlertTriangle,
  auditoria_planificada: Calendar,
  verificacion_eficacia_pendiente: ClipboardCheck,
  mencion: Info,
  sistema: Info,
};

function tiempoRelativo(fecha: string): string {
  const ahora = Date.now();
  const t = new Date(fecha).getTime();
  const seg = Math.floor((ahora - t) / 1000);
  if (seg < 60) return "recién";
  const min = Math.floor(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(fecha).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function CampanaNotificaciones({ usuarioId }: { usuarioId: string | null }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [cargando, setCargando] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  const noLeidas = notifs.filter((n) => n.leida_en === null).length;

  const cargar = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("notificaciones")
      .select("id, tipo, prioridad, titulo, mensaje, url_destino, leida_en, fecha_envio")
      .is("archivada_en", null)
      .order("fecha_envio", { ascending: false })
      .limit(30);
    setNotifs((data ?? []) as Notif[]);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Suscripción Realtime: nuevas notificaciones para este usuario.
  useEffect(() => {
    if (!usuarioId) return;
    const supabase = createClient();
    const canal = supabase
      .channel(`notificaciones:${usuarioId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `usuario_destino_id=eq.${usuarioId}`,
        },
        (payload) => {
          setNotifs((prev) => [payload.new as Notif, ...prev]);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [usuarioId]);

  // Cerrar al hacer clic afuera.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function abrirNotif(n: Notif) {
    if (n.leida_en === null) {
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida_en: new Date().toISOString() } : x)));
      marcarNotificacionLeida(n.id);
    }
    setAbierto(false);
    if (n.url_destino) router.push(n.url_destino);
  }

  async function marcarTodas() {
    setNotifs((prev) => prev.map((x) => ({ ...x, leida_en: x.leida_en ?? new Date().toISOString() })));
    await marcarTodasLeidas();
  }

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="icon" aria-label="Notificaciones" className="relative" onClick={() => setAbierto((v) => !v)}>
        <Bell className="h-4 w-4 text-[#16367f]" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-accent-foreground">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </Button>

      {abierto && (
        <div role="menu" className="absolute right-0 mt-2 w-80 sm:w-96 origin-top-right rounded-md border border-border bg-card shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium">Notificaciones</span>
            {noLeidas > 0 && (
              <button onClick={marcarTodas} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <CheckCheck className="h-3.5 w-3.5" />Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {cargando ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="mb-2 h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No tenés notificaciones</p>
              </div>
            ) : (
              notifs.map((n) => {
                const Icono = ICONO_POR_TIPO[n.tipo] ?? Info;
                const noLeida = n.leida_en === null;
                return (
                  <button
                    key={n.id}
                    onClick={() => abrirNotif(n)}
                    className={`flex w-full gap-3 border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/50 ${noLeida ? "bg-accent/5" : ""}`}
                  >
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${n.prioridad === "alta" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                      <Icono className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm ${noLeida ? "font-medium" : ""}`}>{n.titulo}</p>
                        {noLeida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.mensaje}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground/70">{tiempoRelativo(n.fecha_envio)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
