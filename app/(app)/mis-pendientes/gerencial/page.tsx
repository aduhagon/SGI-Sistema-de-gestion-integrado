import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bell, Filter, ListChecks, Search, Users } from "lucide-react";
import { obtenerDetalleTableroPendientesResponsables, obtenerSeguimientosPendientesGerenciales, type EstadoSeguimientoPendiente } from "@/lib/api/pendientes";
import { MetricCard, MetricGrid, PageContainer, PageHeader } from "@/components/ui/page";
import { guardarSeguimientoPendienteGerencial } from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const NIVEL_TEXTO = {
  vencido: "Vencido",
  vencido_hoy: "Vence hoy",
  advertencia: "Proximo",
  recordatorio: "Proximo",
};

const NIVEL_CLASE = {
  vencido: "bg-red-50 text-red-700 ring-red-100",
  vencido_hoy: "bg-amber-50 text-amber-700 ring-amber-100",
  advertencia: "bg-blue-50 text-blue-700 ring-blue-100",
  recordatorio: "bg-slate-50 text-slate-600 ring-slate-100",
};

const SEGUIMIENTO_TEXTO: Record<EstadoSeguimientoPendiente, string> = {
  sin_revisar: "Sin revisar",
  en_curso: "En curso",
  bloqueado: "Bloqueado",
  contactado: "Contactado",
};

const SEGUIMIENTO_CLASE: Record<EstadoSeguimientoPendiente, string> = {
  sin_revisar: "bg-slate-50 text-slate-600 ring-slate-100",
  en_curso: "bg-blue-50 text-blue-700 ring-blue-100",
  bloqueado: "bg-red-50 text-red-700 ring-red-100",
  contactado: "bg-emerald-50 text-emerald-700 ring-emerald-100",
};

function valorParametro(searchParams: SearchParams, clave: string): string {
  const valor = searchParams[clave];
  return Array.isArray(valor) ? valor[0] ?? "" : valor ?? "";
}

function claveResponsable(usuarioId: string | null, responsable: string): string {
  return usuarioId ?? `sin-id:${responsable}`;
}

function claveSeguimiento(responsableClave: string, modulo: string, entidadId: string): string {
  return `${responsableClave}|${modulo}|${entidadId}`;
}

function textoDias(dias: number | null): string {
  if (dias === null) return "Sin fecha";
  if (dias < 0) return `${Math.abs(dias)} d vencido`;
  if (dias === 0) return "Hoy";
  return `${dias} d`;
}

function queryActual(searchParams: SearchParams): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(searchParams)) {
    const primero = Array.isArray(valor) ? valor[0] : valor;
    if (primero) params.set(clave, primero);
  }
  const qs = params.toString();
  return qs ? `/mis-pendientes/gerencial?${qs}` : "/mis-pendientes/gerencial";
}

export default async function TableroGerencialPendientesPage({ searchParams }: { searchParams: SearchParams }) {
  const [detalle, seguimientos] = await Promise.all([
    obtenerDetalleTableroPendientesResponsables(),
    obtenerSeguimientosPendientesGerenciales(),
  ]);

  const responsable = valorParametro(searchParams, "responsable");
  const modulo = valorParametro(searchParams, "modulo");
  const estado = valorParametro(searchParams, "estado");
  const seguimientoFiltro = valorParametro(searchParams, "seguimiento");
  const busqueda = valorParametro(searchParams, "q").trim().toLowerCase();
  const volverA = queryActual(searchParams);

  if (detalle === null) {
    return <PageContainer width="wide">
      <PageHeader eyebrow="Tablero gerencial" title="Pendientes por responsable" description="Vista disponible para roles de gestion SGI." actions={<Link href="/mis-pendientes" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"><ArrowLeft className="h-4 w-4" />Volver</Link>} />
      <div className="rounded-xl border border-dashed py-16 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="font-medium">No hay tablero gerencial disponible</p>
        <p className="mt-1 text-sm text-muted-foreground">Tu usuario puede seguir usando su centro de pendientes personal.</p>
      </div>
    </PageContainer>;
  }

  const seguimientoPorClave = new Map((seguimientos ?? []).map((item) => [
    claveSeguimiento(item.responsableClave, item.modulo, item.entidadId),
    item,
  ]));

  const responsables = Array.from(new Map(detalle.map((item) => [claveResponsable(item.usuarioId, item.responsable), item.responsable])).entries())
    .sort((a, b) => a[1].localeCompare(b[1]));
  const modulos = Array.from(new Map(detalle.map((item) => [item.modulo, item.moduloLabel])).entries())
    .sort((a, b) => a[1].localeCompare(b[1]));

  const enriquecidos = detalle.map((item) => {
    const responsableClave = claveResponsable(item.usuarioId, item.responsable);
    const seguimiento = seguimientoPorClave.get(claveSeguimiento(responsableClave, item.modulo, item.entidadId));
    return {
      ...item,
      responsableClave,
      seguimientoEstado: seguimiento?.estado ?? "sin_revisar" as EstadoSeguimientoPendiente,
      seguimientoNota: seguimiento?.nota ?? "",
      seguimientoActualizadoEn: seguimiento?.actualizadoEn ?? null,
    };
  });

  const filtrados = enriquecidos.filter((item) => {
    if (responsable && item.responsableClave !== responsable) return false;
    if (modulo && item.modulo !== modulo) return false;
    if (estado === "vencidos" && item.nivel !== "vencido") return false;
    if (estado === "hoy" && item.nivel !== "vencido_hoy") return false;
    if (estado === "proximos" && !["advertencia", "recordatorio"].includes(item.nivel)) return false;
    if (seguimientoFiltro && item.seguimientoEstado !== seguimientoFiltro) return false;
    if (busqueda) {
      const texto = `${item.responsable} ${item.moduloLabel} ${item.codigo} ${item.titulo} ${item.seguimientoNota}`.toLowerCase();
      if (!texto.includes(busqueda)) return false;
    }
    return true;
  });

  const total = filtrados.length;
  const vencidos = filtrados.filter((item) => item.nivel === "vencido").length;
  const hoy = filtrados.filter((item) => item.nivel === "vencido_hoy").length;
  const bloqueados = filtrados.filter((item) => item.seguimientoEstado === "bloqueado").length;

  return <PageContainer width="wide">
    <PageHeader eyebrow="Tablero gerencial" title="Pendientes por responsable" description="Vista completa para priorizar, contactar responsables y registrar bloqueos operativos." actions={<Link href="/mis-pendientes" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"><ArrowLeft className="h-4 w-4" />Volver</Link>}>
      <MetricGrid>
        <MetricCard value={total} label="Filtrados" icon={<ListChecks className="h-4 w-4" />} />
        <MetricCard value={vencidos} label="Vencidos" tone={vencidos ? "danger" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
        <MetricCard value={hoy} label="Vencen hoy" tone={hoy ? "warning" : "success"} icon={<Bell className="h-4 w-4" />} />
        <MetricCard value={bloqueados} label="Bloqueados" tone={bloqueados ? "danger" : "success"} icon={<Bell className="h-4 w-4" />} />
      </MetricGrid>
    </PageHeader>

    <form className="mb-4 grid gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]" action="/mis-pendientes/gerencial">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={valorParametro(searchParams, "q")} placeholder="Buscar por responsable, codigo, tarea o nota" className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      </label>
      <select name="responsable" defaultValue={responsable} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
        <option value="">Todos los responsables</option>
        {responsables.map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
      </select>
      <select name="modulo" defaultValue={modulo} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
        <option value="">Todos los modulos</option>
        {modulos.map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
      </select>
      <select name="estado" defaultValue={estado} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
        <option value="">Todos los estados</option>
        <option value="vencidos">Vencidos</option>
        <option value="hoy">Vencen hoy</option>
        <option value="proximos">Proximos</option>
      </select>
      <select name="seguimiento" defaultValue={seguimientoFiltro} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
        <option value="">Todo seguimiento</option>
        {Object.entries(SEGUIMIENTO_TEXTO).map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
      </select>
      <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Filter className="h-4 w-4" />Filtrar</button>
    </form>

    {filtrados.length === 0 ? <div className="rounded-xl border border-dashed py-16 text-center">
      <ListChecks className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
      <p className="font-medium">No hay pendientes con esos filtros</p>
      <p className="mt-1 text-sm text-muted-foreground">Proba limpiar responsable, modulo, estado, seguimiento o busqueda.</p>
    </div> : <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden grid-cols-[1fr_1fr_1.4fr_0.55fr_1.4fr_0.35fr] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground md:grid">
        <span>Responsable</span>
        <span>Modulo</span>
        <span>Pendiente</span>
        <span>Plazo</span>
        <span>Seguimiento</span>
        <span className="text-right">Abrir</span>
      </div>
      <div className="divide-y divide-border">
        {filtrados.map((item) => <div key={`${item.responsableClave}-${item.modulo}-${item.entidadId}`} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_1fr_1.4fr_0.55fr_1.4fr_0.35fr] md:items-start">
          <div>
            <p className="text-sm font-semibold">{item.responsable}</p>
            {item.username ? <p className="text-xs text-muted-foreground">{item.username}</p> : null}
          </div>
          <div>
            <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">{item.moduloLabel}</span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${NIVEL_CLASE[item.nivel]}`}>{NIVEL_TEXTO[item.nivel]}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{item.codigo}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm font-medium">{item.titulo}</p>
          </div>
          <div>
            <p className="text-sm font-medium">{textoDias(item.diasRestantes)}</p>
            <p className="text-xs text-muted-foreground">{item.fechaLimite ?? "Sin fecha"}</p>
          </div>
          <form action={guardarSeguimientoPendienteGerencial} className="space-y-2">
            <input type="hidden" name="modulo" value={item.modulo} />
            <input type="hidden" name="entidadId" value={item.entidadId} />
            <input type="hidden" name="responsableClave" value={item.responsableClave} />
            <input type="hidden" name="responsableNombre" value={item.responsable} />
            <input type="hidden" name="volverA" value={volverA} />
            <div className="flex flex-col gap-2 sm:flex-row md:flex-col">
              <select name="estado" defaultValue={item.seguimientoEstado} className="h-9 rounded-md border border-border bg-background px-2 text-xs">
                {Object.entries(SEGUIMIENTO_TEXTO).map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
              </select>
              <input name="nota" defaultValue={item.seguimientoNota} maxLength={240} placeholder="Nota breve" className="h-9 rounded-md border border-border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${SEGUIMIENTO_CLASE[item.seguimientoEstado]}`}>{SEGUIMIENTO_TEXTO[item.seguimientoEstado]}</span>
              <button type="submit" className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted">Guardar</button>
            </div>
          </form>
          <div className="md:text-right">
            <Link href={item.urlDestino} className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">Abrir</Link>
          </div>
        </div>)}
      </div>
    </div>}
  </PageContainer>;
}
