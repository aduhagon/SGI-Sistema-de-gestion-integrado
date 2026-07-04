import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { obtenerUsuarioActualId } from "@/lib/api/aprobaciones";
import { datosParaExportarRequisitos } from "@/lib/api/requisitos-legales";
import {
  ETIQUETA_TIPO,
  ETIQUETA_CUMPLIMIENTO,
} from "@/lib/schemas/requisito-legal";

export const dynamic = "force-dynamic";

const SI_NO = (v: boolean) => (v ? "Sí" : "No");
const cap = (s: string | null) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "";

export async function GET(req: NextRequest) {
  // Respeta sesión (RLS). Si no hay sesión, 401.
  const usuarioId = await obtenerUsuarioActualId();
  if (!usuarioId) {
    return new Response("No autorizado", { status: 401 });
  }

  const norma = req.nextUrl.searchParams.get("norma") ?? undefined;
  const filas = await datosParaExportarRequisitos(
    norma && norma !== "__todas__" ? norma : undefined,
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "SGI MSU";
  wb.created = new Date();
  const ws = wb.addWorksheet("Requisitos legales", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  ws.columns = [
    { header: "Código", key: "codigo", width: 14 },
    { header: "Título", key: "titulo", width: 42 },
    { header: "Tipo", key: "tipo", width: 16 },
    { header: "Categoría", key: "categoria", width: 18 },
    { header: "Jurisdicción", key: "jurisdiccion", width: 16 },
    { header: "Organismo emisor", key: "organismo", width: 24 },
    { header: "Referencia", key: "referencia", width: 16 },
    { header: "Artículos aplicables", key: "articulos", width: 22 },
    { header: "Vigente desde", key: "vigencia", width: 14 },
    { header: "Normas", key: "normas", width: 26 },
    { header: "Procesos", key: "procesos", width: 20 },
    { header: "Criticidad", key: "criticidad", width: 12 },
    { header: "Requiere verificación", key: "requiere", width: 18 },
    { header: "Sanciones", key: "sanciones", width: 32 },
    { header: "Ref. sanciones", key: "refSanciones", width: 20 },
    { header: "Último estado", key: "estado", width: 20 },
    { header: "Última evaluación", key: "ultimaEval", width: 16 },
    { header: "Próxima evaluación", key: "proximaEval", width: 16 },
    { header: "URL fuente", key: "url", width: 30 },
    { header: "Descripción", key: "descripcion", width: 48 },
    { header: "Observaciones", key: "observaciones", width: 40 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.alignment = { vertical: "middle" };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F6E56" },
  };
  header.height = 20;

  for (const f of filas) {
    ws.addRow({
      codigo: f.codigo,
      titulo: f.titulo,
      tipo: ETIQUETA_TIPO[f.tipo as keyof typeof ETIQUETA_TIPO] ?? f.tipo,
      categoria: f.categoria ?? "",
      jurisdiccion: f.jurisdiccion ?? "",
      organismo: f.organismoEmisor ?? "",
      referencia: f.referencia ?? "",
      articulos: f.articulosAplicables ?? "",
      vigencia: f.fechaVigenciaDesde ?? "",
      normas: f.normas,
      procesos: f.procesos,
      criticidad: cap(f.criticidad),
      requiere: SI_NO(f.requiereVerificacion),
      sanciones: f.sanciones ?? "",
      refSanciones: f.referenciaSanciones ?? "",
      estado: f.ultimoEstado
        ? (ETIQUETA_CUMPLIMIENTO[
            f.ultimoEstado as keyof typeof ETIQUETA_CUMPLIMIENTO
          ] ?? f.ultimoEstado)
        : "Sin evaluar",
      ultimaEval: f.ultimaEvaluacion ?? "",
      proximaEval: f.proximaEvaluacion ?? "",
      url: f.urlFuente ?? "",
      descripcion: f.descripcion ?? "",
      observaciones: f.observaciones ?? "",
    });
  }

  // Ajustes de presentación: wrap en columnas largas.
  ["titulo", "sanciones", "descripcion", "observaciones"].forEach((k) => {
    ws.getColumn(k).alignment = { wrapText: true, vertical: "top" };
  });

  const buffer = await wb.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = `requisitos-legales-${fecha}.xlsx`;

  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
