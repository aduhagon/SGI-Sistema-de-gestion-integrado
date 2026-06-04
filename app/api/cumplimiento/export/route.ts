import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { obtenerNormasConRequisitos, obtenerMatriz } from "@/lib/api/matriz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ETIQUETA_COBERTURA: Record<string, string> = {
  total: "Total",
  parcial: "Parcial",
  referencia: "Referencia",
};

export async function GET(req: NextRequest) {
  const versionNormaId = req.nextUrl.searchParams.get("norma");

  const normas = await obtenerNormasConRequisitos();
  if (normas.length === 0) {
    return NextResponse.json(
      { error: "No hay normas con requisitos cargados." },
      { status: 400 },
    );
  }

  const aExportar = versionNormaId
    ? normas.filter((n) => n.versionNormaId === versionNormaId)
    : normas;

  if (aExportar.length === 0) {
    return NextResponse.json({ error: "Norma no encontrada." }, { status: 404 });
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "SGI Multinorma MSU";
  wb.created = new Date();

  const resumen = wb.addWorksheet("Resumen");
  resumen.columns = [
    { header: "Norma", key: "norma", width: 28 },
    { header: "Versión", key: "version", width: 12 },
    { header: "Requisitos", key: "total", width: 14 },
    { header: "Cubiertos", key: "cubiertos", width: 14 },
    { header: "Cobertura %", key: "pct", width: 14 },
    { header: "Críticos sin cubrir", key: "criticos", width: 20 },
  ];

  for (const norma of aExportar) {
    const matriz = await obtenerMatriz(norma.versionNormaId);
    if (!matriz) continue;

    const pct =
      matriz.totalRequisitos > 0
        ? Math.round((matriz.requisitosCubiertos / matriz.totalRequisitos) * 100)
        : 0;

    resumen.addRow({
      norma: `${matriz.norma.codigo} — ${matriz.norma.nombreCorto}`,
      version: matriz.norma.version,
      total: matriz.totalRequisitos,
      cubiertos: matriz.requisitosCubiertos,
      pct: `${pct}%`,
      criticos: matriz.requisitosCriticosSinCobertura,
    });

    const nombreHoja = `${matriz.norma.codigo}`.slice(0, 31);
    const hoja = wb.addWorksheet(nombreHoja);
    hoja.columns = [
      { header: "Cláusula", key: "clausula", width: 12 },
      { header: "Requisito", key: "titulo", width: 50 },
      { header: "Crítico", key: "critico", width: 10 },
      { header: "Estado", key: "estado", width: 16 },
      { header: "Documentos que lo cubren", key: "docs", width: 40 },
      { header: "Tipo de cobertura", key: "tipos", width: 20 },
    ];

    for (const r of matriz.requisitos) {
      const docs = r.coberturas.map((c) => c.codigo).join(", ");
      const tipos = r.coberturas
        .map((c) => ETIQUETA_COBERTURA[c.tipoCobertura] ?? c.tipoCobertura)
        .join(", ");
      const fila = hoja.addRow({
        clausula: r.clausula,
        titulo: r.titulo,
        critico: r.esCritico ? "Sí" : "",
        estado: r.cubierto ? "Cubierto" : "Sin cobertura",
        docs,
        tipos,
      });

      if (!r.cubierto) {
        fila.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFFDE8E8" },
          };
        });
      }
    }

    hoja.getRow(1).font = { bold: true };
    hoja.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF1F5F9" },
    };
    hoja.autoFilter = { from: "A1", to: "F1" };
    hoja.views = [{ state: "frozen", ySplit: 1 }];
  }

  resumen.getRow(1).font = { bold: true };
  resumen.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF1F5F9" },
  };

  const buffer = await wb.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);
  const nombre = versionNormaId
    ? `cumplimiento_${aExportar[0].codigo}_${fecha}.xlsx`
    : `cumplimiento_multinorma_${fecha}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
