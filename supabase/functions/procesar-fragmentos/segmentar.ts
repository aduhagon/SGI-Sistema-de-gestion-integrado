// Segmentacion de un documento en bloques bajo heading.
// v3: (a) un numeral seguido de una oracion larga es un item de lista, no un
// heading; (b) las entradas del indice de contenidos de los PDF duplican las
// secciones reales y se deduplican quedandose con la que tiene cuerpo.

export type Linea = {
  texto: string;
  pagina?: number;
  estilo?: string;
  nivelEstilo?: number;
};

export type Fragmento = {
  orden: number;
  tipo: "preambulo" | "seccion" | "subseccion" | "tabla" | "anexo";
  numeral: string | null;
  nivel: number | null;
  titulo: string | null;
  texto: string;
  pagina: number | null;
};

const RE_NUMERAL = /^(\d{1,2}(?:\.\d{1,3}){0,4})[.)]?\s+(\S.{1,140})$/;
const RE_ANEXO = /^(anexo|ap[eé]ndice)\s+([A-Z0-9]{1,4})\s*[.:\-–]?\s*(.*)$/i;
const RE_MAYUSCULAS = /^[A-ZÁÉÍÓÚÑÜ][A-ZÁÉÍÓÚÑÜ0-9\s,()\/\-]{2,60}$/;

function nivelDeEstilo(estilo?: string): number | null {
  if (!estilo) return null;
  const m = /^(?:Heading|Ttulo|T[ií]tulo|Titulo)\s*(\d)$/i.exec(estilo.trim());
  return m ? Number(m[1]) : null;
}

// Un titulo de seccion es corto. Una oracion numerada de lista es larga o
// contiene puntuacion interna de oracion.
function pareceTitulo(s: string): boolean {
  const t = s.trim();
  if (t.length > 90) return false;
  if (/[.:;,]$/.test(t)) return false;
  const palabras = t.split(/\s+/).length;
  if (palabras > 10) return false;
  // Oraciones tipicas de lista: contienen verbo conjugado tras coma o "que".
  if (palabras > 6 && /,/.test(t)) return false;
  return true;
}

export function limpiarRepetidos(paginas: string[][]): string[][] {
  if (paginas.length < 3) return paginas;
  const frec = new Map<string, number>();
  for (const p of paginas) {
    const unicas = new Set(p.map((l) => l.trim()));
    for (const l of unicas) {
      if (l.length < 3 || l.length > 120) continue;
      frec.set(l, (frec.get(l) ?? 0) + 1);
    }
  }
  const umbral = Math.ceil(paginas.length * 0.6);
  const ruido = new Set(
    [...frec.entries()].filter(([, n]) => n >= umbral).map(([l]) => l),
  );
  return paginas.map((p) =>
    p.filter((l) => {
      const t = l.trim();
      if (ruido.has(t)) return false;
      if (/^(p[aá]gina\s+)?\d{1,3}\s*(de|\/)\s*\d{1,3}$/i.test(t)) return false;
      if (/^\d{1,3}$/.test(t)) return false;
      return true;
    })
  );
}

/** Colapsa duplicados numeral+titulo (entrada del indice vs seccion real). */
function deduplicar(frags: Fragmento[]): Fragmento[] {
  const porClave = new Map<string, Fragmento>();
  const sinClave: Fragmento[] = [];
  for (const f of frags) {
    if (!f.numeral || !f.titulo) {
      sinClave.push(f);
      continue;
    }
    const clave = `${f.numeral}|${f.titulo.toLowerCase()}`;
    const previo = porClave.get(clave);
    if (!previo || f.texto.length > previo.texto.length) {
      porClave.set(clave, f);
    }
  }
  return [...sinClave, ...porClave.values()]
    .sort((a, b) => a.orden - b.orden)
    .map((f, i) => ({ ...f, orden: i + 1 }));
}

export function segmentar(lineas: Linea[]): Fragmento[] {
  const out: Fragmento[] = [];
  let actual: Fragmento | null = null;
  const cuerpo: string[] = [];
  const contadores: number[] = [0, 0, 0, 0, 0, 0];

  const cerrar = () => {
    if (!actual) return;
    actual.texto = cuerpo.join("\n").trim();
    if (actual.texto.length === 0 && actual.titulo) actual.texto = actual.titulo;
    if (actual.texto.length > 0) out.push(actual);
    cuerpo.length = 0;
  };

  const abrir = (f: Omit<Fragmento, "orden">) => {
    cerrar();
    actual = { orden: out.length + 1, ...f };
  };

  const numeralSintetico = (nivel: number): string => {
    contadores[nivel - 1]++;
    for (let i = nivel; i < contadores.length; i++) contadores[i] = 0;
    return contadores.slice(0, nivel).map((n) => Math.max(n, 1)).join(".");
  };

  const sincronizarContadores = (numeral: string) => {
    const partes = numeral.split(".").map(Number);
    for (let i = 0; i < contadores.length; i++) {
      contadores[i] = i < partes.length ? partes[i] : 0;
    }
  };

  for (const l of lineas) {
    const t = l.texto.trim();
    if (!t) continue;

    const mAnexo = RE_ANEXO.exec(t);
    if (mAnexo && t.length <= 140) {
      abrir({
        tipo: "anexo",
        numeral: `${mAnexo[1]} ${mAnexo[2]}`.toUpperCase(),
        nivel: 1,
        titulo: (mAnexo[3] || "").trim() || null,
        texto: "",
        pagina: l.pagina ?? null,
      });
      continue;
    }

    // Caso 1: numeral escrito en el texto y titulo con forma de titulo.
    const m = RE_NUMERAL.exec(t);
    if (m && pareceTitulo(m[2])) {
      const numeral = m[1];
      const nivel = numeral.split(".").length;
      sincronizarContadores(numeral);
      abrir({
        tipo: nivel === 1 ? "seccion" : "subseccion",
        numeral,
        nivel,
        titulo: m[2].trim(),
        texto: "",
        pagina: l.pagina ?? null,
      });
      continue;
    }

    // Caso 2: estilo Heading/Titulo de Word (numeracion automatica).
    const nivelEstilo = l.nivelEstilo ?? nivelDeEstilo(l.estilo);
    if (nivelEstilo !== null && t.length <= 140) {
      const nivel = Math.min(nivelEstilo, 6);
      abrir({
        tipo: nivel === 1 ? "seccion" : "subseccion",
        numeral: numeralSintetico(nivel),
        nivel,
        titulo: t,
        texto: "",
        pagina: l.pagina ?? null,
      });
      continue;
    }

    // Caso 3: heading en mayusculas sostenidas sin numero.
    if (RE_MAYUSCULAS.test(t) && t === t.toUpperCase() && t.length <= 60) {
      abrir({
        tipo: "seccion",
        numeral: numeralSintetico(1),
        nivel: 1,
        titulo: t,
        texto: "",
        pagina: l.pagina ?? null,
      });
      continue;
    }

    if (!actual) {
      abrir({
        tipo: "preambulo",
        numeral: null,
        nivel: null,
        titulo: null,
        texto: "",
        pagina: l.pagina ?? null,
      });
    }
    cuerpo.push(t);
  }
  cerrar();

  return deduplicar(out);
}
