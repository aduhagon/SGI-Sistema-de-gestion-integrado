"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, ShieldAlert, Loader2, Search, X, ChevronLeft, ChevronRight,
  FileClock, Users, Boxes, AlertCircle, Fingerprint,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  listarEventos, obtenerDetalleEvento, verificarCadena, ACCIONES,
  type EventoAuditoria, type DetalleEvento, type ResumenAuditoria,
  type VerificacionCadena,
} from "@/lib/api/auditoria";

const ENTIDADES = [
  "acciones", "acuses_lectura", "aprobaciones", "archivos", "asignacion_rol_global",
  "auditorias", "coberturas", "documentos", "hallazgos", "no_conformidades",
  "participacion_usuario_proceso", "puesto_proceso_rol", "versiones",
];

const PAGE = 50;

function fmtFecha(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const ACCION_COLOR: Record<string, string> = {
  crear: "#059669", modificar: "#0284c7", eliminar_logico: "#dc2626",
  restaurar: "#7c3aed", aprobar: "#059669", rechazar: "#dc2626",
  firmar: "#0891b2", login: "#6b7280", logout: "#6b7280", configurar: "#d97706",
};

export default function VisorAuditoria({ resumenInicial }: { resumenInicial: ResumenAuditoria }) {
  const [eventos, setEventos] = useState<EventoAuditoria[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [usuario, setUsuario] = useState("");
  const [accion, setAccion] = useState("");
  const [entidad, setEntidad] = useState("");

  // detalle
  const [detalle, setDetalle] = useState<DetalleEvento | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // verificación
  const [verif, setVerif] = useState<VerificacionCadena | null>(null);
  const [verificando, setVerificando] = useState(false);

  const cargar = useCallback(async (p: number) => {
    setCargando(true);
    setError(null);
    const r = await listarEventos({
      desde: desde ? new Date(desde).toISOString() : null,
      hasta: hasta ? new Date(hasta + "T23:59:59").toISOString() : null,
      usuario: usuario.trim() || null,
      accion: accion || null,
      entidad: entidad || null,
      limit: PAGE,
      offset: p * PAGE,
    });
    setCargando(false);
    if ("error" in r) { setError(r.error); return; }
    setEventos(r.eventos);
    setTotal(r.total);
  }, [desde, hasta, usuario, accion, entidad]);

  useEffect(() => { cargar(0); setPagina(0); }, []); // carga inicial

  function aplicarFiltros() { setPagina(0); cargar(0); }
  function limpiar() {
    setDesde(""); setHasta(""); setUsuario(""); setAccion(""); setEntidad("");
    setTimeout(() => { setPagina(0); cargar(0); }, 0);
  }

  async function irPagina(p: number) { setPagina(p); await cargar(p); }

  async function abrirDetalle(id: number) {
    setCargandoDetalle(true);
    const r = await obtenerDetalleEvento(id);
    setCargandoDetalle(false);
    if ("error" in r) { setError(r.error); return; }
    setDetalle(r);
  }

  async function verificar() {
    setVerificando(true);
    const r = await verificarCadena();
    setVerificando(false);
    if ("error" in r) { setError(r.error); return; }
    setVerif(r);
  }

  const totalPaginas = Math.max(1, Math.ceil(total / PAGE));

  return (
    <section className="mt-8">
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tarjeta icon={FileClock} label="Eventos registrados" valor={resumenInicial.total.toLocaleString("es-AR")} />
        <Tarjeta icon={Users} label="Usuarios con actividad" valor={String(resumenInicial.usuarios)} />
        <Tarjeta icon={Boxes} label="Tipos de entidad" valor={String(resumenInicial.tipos_entidad)} />
        <Tarjeta icon={FileClock} label="Período"
          valor={`${resumenInicial.desde ? fmtFecha(resumenInicial.desde).slice(0, 10) : "—"} → ${resumenInicial.hasta ? fmtFecha(resumenInicial.hasta).slice(0, 10) : "—"}`}
          chico />
      </div>

      {/* Verificador de integridad */}
      <div className="mt-4 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Fingerprint className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Integridad de la bitácora</p>
              <p className="text-xs text-muted-foreground">
                Recalcula la cadena de hashes y verifica que ningún registro fue alterado.
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={verificar} disabled={verificando}>
            {verificando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Verificar ahora
          </Button>
        </div>
        {verif && (
          <div className={`mt-3 flex items-start gap-2 rounded-md px-3 py-2 text-sm ${verif.intacta ? "bg-emerald-50 text-emerald-800" : "bg-destructive/10 text-destructive"}`}>
            {verif.intacta ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />}
            {verif.intacta
              ? `Cadena íntegra. Se verificaron ${verif.eventos_revisados} eventos sin alteraciones.`
              : `¡Atención! La cadena se rompe en el evento #${verif.roto_en_id}. Puede haber un registro alterado.`}
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Desde</label>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Hasta</label>
          <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Usuario (email)</label>
          <input type="text" value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="parte del email" className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Acción</label>
          <select value={accion} onChange={(e) => setAccion(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="">Todas</option>
            {ACCIONES.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Entidad</label>
          <select value={entidad} onChange={(e) => setEntidad(e.target.value)} className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm">
            <option value="">Todas</option>
            {ENTIDADES.map((en) => <option key={en} value={en}>{en}</option>)}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <Button size="sm" onClick={aplicarFiltros} className="flex-1">
            <Search className="h-3.5 w-3.5" />Filtrar
          </Button>
          <Button size="sm" variant="outline" onClick={limpiar}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {/* Tabla */}
      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5 font-medium">Fecha</th>
              <th className="px-4 py-2.5 font-medium">Usuario</th>
              <th className="px-4 py-2.5 font-medium">Acción</th>
              <th className="px-4 py-2.5 font-medium">Entidad</th>
              <th className="px-4 py-2.5 font-medium">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" />
              </td></tr>
            ) : eventos.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                No hay eventos para los filtros aplicados.
              </td></tr>
            ) : eventos.map((e) => (
              <tr key={e.id} onClick={() => abrirDetalle(e.id)}
                className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{fmtFecha(e.timestamp_utc)}</td>
                <td className="px-4 py-2.5">{e.usuario_email ?? <span className="text-muted-foreground">sistema</span>}</td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{ backgroundColor: `${ACCION_COLOR[e.accion] ?? "#6b7280"}15`, color: ACCION_COLOR[e.accion] ?? "#6b7280" }}>
                    {e.accion}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-mono text-xs">{e.entidad_tipo}</td>
                <td className="max-w-xs truncate px-4 py-2.5 text-muted-foreground">{e.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{total.toLocaleString("es-AR")} eventos · página {pagina + 1} de {totalPaginas}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => irPagina(pagina - 1)} disabled={pagina <= 0 || cargando}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => irPagina(pagina + 1)} disabled={pagina + 1 >= totalPaginas || cargando}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Panel de detalle */}
      {(detalle || cargandoDetalle) && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-foreground/40 backdrop-blur-sm" onClick={() => setDetalle(null)} />
          <div className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-card shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <h3 className="font-serif text-xl font-semibold">Detalle del evento</h3>
              <button onClick={() => setDetalle(null)} className="rounded-md p-1.5 hover:bg-muted" aria-label="Cerrar">
                <X className="h-4 w-4" />
              </button>
            </div>
            {cargandoDetalle ? (
              <div className="p-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>
            ) : detalle && (
              <div className="space-y-5 p-6">
                <Campo label="Evento #" valor={String(detalle.id)} />
                <Campo label="Fecha (UTC)" valor={fmtFecha(detalle.timestamp_utc)} />
                <Campo label="Usuario" valor={detalle.usuario_email ?? "sistema"} />
                <Campo label="Acción" valor={detalle.accion} />
                <Campo label="Entidad" valor={`${detalle.entidad_tipo}${detalle.entidad_id ? ` · ${detalle.entidad_id}` : ""}`} />
                <Campo label="Descripción" valor={detalle.descripcion ?? "—"} />
                {detalle.ip_origen && <Campo label="IP de origen" valor={String(detalle.ip_origen)} />}
                {detalle.user_agent && <Campo label="Navegador" valor={detalle.user_agent} />}

                {(detalle.datos_antes != null || detalle.datos_despues != null) && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cambios</p>
                    <div className="grid grid-cols-1 gap-3">
                      <BloqueJson titulo="Antes" data={detalle.datos_antes} />
                      <BloqueJson titulo="Después" data={detalle.datos_despues} />
                    </div>
                  </div>
                )}

                <div className="space-y-2 rounded-md bg-muted/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Integridad</p>
                  <HashLinea label="Hash propio" valor={detalle.hash_propio} />
                  <HashLinea label="Hash anterior" valor={detalle.hash_anterior} />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function Tarjeta({ icon: Icon, label, valor, chico }: { icon: any; label: string; valor: string; chico?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className={`mt-1.5 font-semibold ${chico ? "text-sm" : "text-2xl"}`}>{valor}</p>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-words text-sm">{valor}</p>
    </div>
  );
}

function BloqueJson({ titulo, data }: { titulo: string; data: unknown }) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-medium">{titulo}</div>
      <pre className="max-h-48 overflow-auto p-3 text-xs">
        {data == null ? "—" : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}

function HashLinea({ label, valor }: { label: string; valor: string | null }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="shrink-0 text-xs text-muted-foreground">{label}:</span>
      <code className="break-all text-[11px]">{valor ?? "—"}</code>
    </div>
  );
}
