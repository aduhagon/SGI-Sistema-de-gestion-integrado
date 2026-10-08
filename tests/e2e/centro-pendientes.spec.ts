import { expect, test } from "@playwright/test";

function esErrorIgnorable(mensaje: string) {
  return mensaje.includes("Failed to fetch RSC payload") && mensaje.includes("Falling back to browser navigation");
}

function registrarErroresCriticos(page: import("@playwright/test").Page) {
  const errores: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && !esErrorIgnorable(message.text())) errores.push(message.text());
  });
  page.on("pageerror", (error) => {
    if (!esErrorIgnorable(error.message)) errores.push(error.message);
  });
  return errores;
}

async function verificarSinOverflowHorizontal(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const margen = 4;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((el) => el.scrollWidth > el.clientWidth + margen && getComputedStyle(el).overflowX === "visible")
      .slice(0, 5)
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        text: el.innerText?.slice(0, 80) ?? "",
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
      }));
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      offenders,
    };
  });

  expect(
    overflow.scrollWidth,
    `La pantalla tiene overflow horizontal. Candidatos: ${JSON.stringify(overflow.offenders)}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 4);
}
function normalizarDestino(href: string) {
  const url = new URL(href, "http://sgi.local");
  return `${url.pathname}${url.search}${url.hash}`;
}

async function obtenerHrefs(page: import("@playwright/test").Page, selector: string) {
  return page.locator(selector).evaluateAll((links) =>
    links
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => Boolean(href)),
  );
}

async function seleccionarDestinosProfundos(page: import("@playwright/test").Page) {
  const destinos = new Set<string>();
  const listado = page.getByRole("region", { name: "Listado de pendientes" });

  if (await listado.isVisible().catch(() => false)) {
    const hrefs = await listado.locator('a[href*="#"], a[href*="?evaluar="]').evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .filter((href): href is string => Boolean(href)),
    );

    const nc = hrefs.find((href) => href.includes("/ncs/") && href.includes("#"));
    const control = hrefs.find((href) => href.includes("/controles/") && href.includes("#ejecucion-"));
    const requisito = hrefs.find((href) => href.includes("/requisitos-legales") && href.includes("evaluar="));

    for (const href of [nc, control, requisito]) {
      if (href) destinos.add(normalizarDestino(href));
    }
  }

  if (![...destinos].some((href) => href.includes("/ncs/"))) {
    await page.goto("/ncs", { waitUntil: "domcontentloaded" });
    const hrefsNC = await obtenerHrefs(page, 'a[href^="/ncs/"]');
    const nc = hrefsNC.find((href) => /^\/ncs\/[0-9a-f-]+$/i.test(normalizarDestino(href)));
    if (nc) destinos.add(`${normalizarDestino(nc)}#descripcion`);
  }

  if (![...destinos].some((href) => href.includes("/controles/"))) {
    await page.goto("/controles", { waitUntil: "domcontentloaded" });
    const hrefsControl = await obtenerHrefs(page, 'a[href*="/ejecuciones"]');
    const control = hrefsControl.find((href) =>
      /^\/controles\/[0-9a-f-]+\/ejecuciones(?:\?.*)?$/i.test(normalizarDestino(href)),
    );
    if (control) destinos.add(`${normalizarDestino(control).split("?")[0]}#ejecucion-no-existente-smoke`);
  }

  if (![...destinos].some((href) => href.includes("/requisitos-legales"))) {
    await page.goto("/requisitos-legales", { waitUntil: "domcontentloaded" });
    const requisitoId = await page.locator("[data-requisito-id]").first().getAttribute("data-requisito-id").catch(() => null);
    if (requisitoId) destinos.add(`/requisitos-legales?evaluar=${requisitoId}`);
  }

  return [...destinos];
}

async function esperarClaseEnId(page: import("@playwright/test").Page, id: string, clase: string) {
  await page.waitForFunction(
    ({ id, clase }) => document.getElementById(id)?.classList.contains(clase),
    { id, clase },
  );
}

async function esperarResaltadoRequisito(page: import("@playwright/test").Page, id: string) {
  await page.waitForFunction((id) => {
    const elementos = Array.from(document.querySelectorAll<HTMLElement>(`[data-requisito-id="${id}"]`));
    return elementos.some((elemento) =>
      elemento.classList.contains("bg-primary/5") ||
      elemento.classList.contains("ring-2") ||
      elemento.classList.contains("border-primary"),
    );
  }, id);
}


test.describe("Centro de pendientes", () => {

  test("abre destinos profundos con aviso y resaltado", async ({ page }) => {
    const errores = registrarErroresCriticos(page);

    const response = await page.goto("/mis-pendientes", { waitUntil: "domcontentloaded" });

    expect(response, "No hubo respuesta HTTP para /mis-pendientes").not.toBeNull();
    expect(response?.status(), "/mis-pendientes respondio con error HTTP").toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Centro de pendientes" })).toBeVisible();

    const destinos = await seleccionarDestinosProfundos(page);
    if (destinos.length === 0) {
      test.skip(true, "No hay datos disponibles para validar destinos profundos.");
    }

    for (const href of destinos) {
      const destino = normalizarDestino(href);
      const destinoUrl = new URL(destino, "http://sgi.local");
      const destinoResponse = await page.goto(destino, { waitUntil: "domcontentloaded" });

      expect(destinoResponse, `No hubo respuesta HTTP para ${destino}`).not.toBeNull();
      expect(destinoResponse?.status(), `${destino} respondio con error HTTP`).toBeLessThan(400);

      if (destinoUrl.hash) {
        const id = decodeURIComponent(destinoUrl.hash.slice(1));

        if (destinoUrl.pathname.startsWith("/controles/")) {
          await expect(page.getByText(/No encontramos la ejecución exacta|Ubicamos la ejecución indicada/)).toBeVisible();
          if (!id.includes("no-existente-smoke")) await esperarClaseEnId(page, id, "ring-2");
        } else {
          await expect(page.getByText("Ubicamos la sección indicada desde el Centro de pendientes.")).toBeVisible();
          await esperarClaseEnId(page, id, "ring-2");
        }
      }

      const requisitoId = destinoUrl.searchParams.get("evaluar");
      if (requisitoId) {
        await expect(page.getByText("Abrimos la evaluación indicada desde el Centro de pendientes")).toBeVisible();
        await esperarResaltadoRequisito(page, requisitoId);
      }
    }

    expect(errores, `Errores criticos: ${errores.join(" | ")}`).toEqual([]);
  });

  test("carga, filtra y mantiene links accionables", async ({ page }) => {
    const errores = registrarErroresCriticos(page);

    const response = await page.goto("/mis-pendientes", { waitUntil: "domcontentloaded" });

    expect(response, "No hubo respuesta HTTP para /mis-pendientes").not.toBeNull();
    expect(response?.status(), "/mis-pendientes respondio con error HTTP").toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Centro de pendientes" })).toBeVisible();

    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toMatch(/\u00c3|\u00c2|\u00e2\u20ac|\ufffd/);
    await verificarSinOverflowHorizontal(page);

    if (await page.getByText(/No ten.s pendientes/).isVisible()) {
      expect(errores, `Errores criticos: ${errores.join(" | ")}`).toEqual([]);
      return;
    }

    const listado = page.getByRole("region", { name: "Listado de pendientes" });
    await expect(listado).toBeVisible();
    await expect(listado.getByText(/Asignado por/i).first()).toBeVisible();

    const buscador = page.getByPlaceholder("Buscar por código, tarea o módulo");
    await expect(buscador).toBeEditable();
    await expect(page.getByRole("button", { name: "Todos" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Urgentes" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Próximos" })).toBeVisible();

    await buscador.fill("zz-smoke-sin-resultados");
    await expect(page.getByText("0 tareas visibles")).toBeVisible();
    await expect(page.getByText("No hay tareas que coincidan con los filtros.")).toBeVisible();
    await page.getByRole("button", { name: "Limpiar filtros" }).click();

    const links = listado.locator("a[href]");
    const cantidadLinks = await links.count();
    expect(cantidadLinks, "La bandeja tiene pendientes pero no genero links accionables").toBeGreaterThan(0);

    for (let i = 0; i < Math.min(cantidadLinks, 25); i += 1) {
      const href = await links.nth(i).getAttribute("href");
      expect(href, `Pendiente ${i + 1} sin href`).toBeTruthy();
      expect(href, `Pendiente ${i + 1} con destino invalido`).toMatch(/^\//);
      expect(href, `Pendiente ${i + 1} con ancla indefinida`).not.toContain("undefined");
      expect(href, `Pendiente ${i + 1} con espacios en URL`).not.toMatch(/\s/);
    }

    const resultadosControl = page.getByRole("link", { name: /Tratar resultado/i });
    const cantidadResultadosControl = await resultadosControl.count();
    for (let i = 0; i < cantidadResultadosControl; i += 1) {
      const href = await resultadosControl.nth(i).getAttribute("href");
      expect(href, "El pendiente de control observado debe abrir la ejecucion exacta").toMatch(
        /^\/controles\/[0-9a-f-]+\/ejecuciones#ejecucion-[0-9a-f-]+$/i,
      );
    }

    await verificarSinOverflowHorizontal(page);
    expect(errores, `Errores criticos: ${errores.join(" | ")}`).toEqual([]);
  });
});
