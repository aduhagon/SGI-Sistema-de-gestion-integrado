import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bell, Filter, ListChecks, Search, Users } from "lucide-react";
import { obtenerDetalleTableroPendientesResponsables } from "@/lib/api/pendientes";
import { MetricCard, MetricGrid, PageContainer, PageHeader } from "@/components/ui/page";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

const NIVEL_TEXTO = {
  vencido: "Vencido",
  vencido_hoy: "Vence hoy",
  advertencia: "Próximo",
  recordatorio: "Próximo",
};

const NIVEL_CLASE = {
  vencido: "bg-red-50 text-red-700 ring-red-100",
  vencido_hoy: "bg-amber-50 text-amber-700 ring-amber-100",
  advertencia: "bg-blue-50 text-blue-700 ring-blue-100",
  recordatorio: "bg-slate-50 text-slate-600 ring-slate-100",
};

function valorParametro(searchParams: SearchParams, clave: string): string {
  const valor = searchParams[clave];
  return Array.isArray(valor) ? valor[0] ?? "" : valor ?? "";
}

function claveResponsable(usuarioId: string | null, responsable: string): string {
  return usuarioId ?? `sin-id:${responsable}`;
}

function textoDias(dias: number | null): string {
  if (dias === null) return "Sin fecha";
  if (dias < 0) return `${Math.abs(dias)} d vencido`;
  if (dias === 0) return "Hoy";
  return `${dias} d`;
}

export default async function TableroGerencialPendientesPage({ searchParams }: { searchParams: SearchParams }) {
  const detalle = await obtenerDetalleTableroPendientesResponsables();

  const responsable = valorParametro(searchParams, "responsable");
  const modulo = valorParametro(searchParams, "modulo");
  const estado = valorParametro(searchParams, "estado");
  const busqueda = valorParametro(searchParams, "q").trim().toLowerCase();

  if (detalle === null) {
    return <PageContainer width="wide">
      <PageHeader eyebrow="Tablero gerencial" title="Pendientes por responsable" description="Vista disponible para roles de gestión SGI." actions={<Link href="/mis-pendientes" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"><ArrowLeft className="h-4 w-4" />Volver</Link>} />
      <div className="rounded-xl border border-dashed py-16 text-center">
        <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
        <p className="font-medium">No hay tablero gerencial disponible</p>
        <p className="mt-1 text-sm text-muted-foreground">Tu usuario puede seguir usando su centro de pendientes personal.</p>
      </div>
    </PageContainer>;
  }

  const responsables = Array.from(new Map(detalle.map((item) => [claveResponsable(item.usuarioId, item.responsable), item.responsable])).entries())
    .sort((a, b) => a[1].localeCompare(b[1]));
  const modulos = Array.from(new Map(detalle.map((item) => [item.modulo, item.moduloLabel])).entries())
    .sort((a, b) => a[1].localeCompare(b[1]));

  const filtrados = detalle.filter((item) => {
    if (responsable && claveResponsable(item.usuarioId, item.responsable) !== responsable) return false;
    if (modulo && item.modulo !== modulo) return false;
    if (estado === "vencidos" && item.nivel !== "vencido") return false;
    if (estado === "hoy" && item.nivel !== "vencido_hoy") return false;
    if (estado === "proximos" && !["advertencia", "recordatorio"].includes(item.nivel)) return false;
    if (busqueda) {
      const texto = `${item.responsable} ${item.moduloLabel} ${item.codigo} ${item.titulo}`.toLowerCase();
      if (!texto.includes(busqueda)) return false;
    }
    return true;
  });

  const total = filtrados.length;
  const vencidos = filtrados.filter((item) => item.nivel === "vencido").length;
  const hoy = filtrados.filter((item) => item.nivel === "vencido_hoy").length;
  const proximos = filtrados.filter((item) => item.nivel === "advertencia" || item.nivel === "recordatorio").length;

  return <PageContainer width="wide">
    <PageHeader eyebrow="Tablero gerencial" title="Pendientes por responsable" description="Vista completa para priorizar vencidos, próximos compromisos y bloqueos operativos por usuario." actions={<Link href="/mis-pendientes" className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium hover:bg-muted"><ArrowLeft className="h-4 w-4" />Volver</Link>}>
      <MetricGrid>
        <MetricCard value={total} label="Filtrados" icon={<ListChecks className="h-4 w-4" />} />
        <MetricCard value={vencidos} label="Vencidos" tone={vencidos ? "danger" : "success"} icon={<AlertTriangle className="h-4 w-4" />} />
        <MetricCard value={hoy} label="Vencen hoy" tone={hoy ? "warning" : "success"} icon={<Bell className="h-4 w-4" />} />
        <MetricCard value={proximos} label="Próximos" tone="info" icon={<Bell className="h-4 w-4" />} />
      </MetricGrid>
    </PageHeader>

    <form className="mb-4 grid gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-[1.2fr_1fr_1fr_1fr_auto]" action="/mis-pendientes/gerencial">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input name="q" defaultValue={valorParametro(searchParams, "q")} placeholder="Buscar por responsable, código o tarea" className="h-10 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20" />
      </label>
      <select name="responsable" defaultValue={responsable} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
        <option value="">Todos los responsables</option>
        {responsables.map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
      </select>
      <select name="modulo" defaultValue={modulo} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
        <option value="">Todos los módulos</option>
        {modulos.map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
      </select>
      <select name="estado" defaultValue={estado} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
        <option value="">Todos los estados</option>
        <option value="vencidos">Vencidos</option>
        <option value="hoy">Vencen hoy</option>
        <option value="proximos">Próximos</option>
      </select>
      <button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"><Filter className="h-4 w-4" />Filtrar</button>
    </form>

    {filtrados.length === 0 ? <div className="rounded-xl border border-dashed py-16 text-center">
      <ListChecks className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
      <p className="font-medium">No hay pendientes con esos filtros</p>
      <p className="mt-1 text-sm text-muted-foreground">Probá limpiar responsable, módulo, estado o búsqueda.</p>
    </div> : <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="hidden grid-cols-[1.1fr_1fr_1.6fr_0.6fr_0.4fr] gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-semibold text-muted-foreground md:grid">
        <span>Responsable</span>
        <span>Módulo</span>
        <span>Pendiente</span>
        <span>Plazo</span>
        <span className="text-right">Acción</span>
      </div>
      <div className="divide-y divide-border">
        {filtrados.map((item) => <div key={`${claveResponsable(item.usuarioId, item.responsable)}-${item.modulo}-${item.entidadId}`} className="grid gap-3 px-4 py-3 md:grid-cols-[1.1fr_1fr_1.6fr_0.6fr_0.4fr] md:items-center">
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
          <div className="md:text-right">
            <Link href={item.urlDestino} className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">Abrir</Link>
          </div>
        </div>)}
      </div>
    </div>}
  </PageContainer>;
}
