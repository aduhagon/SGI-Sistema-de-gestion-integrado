import { expect, test } from "@playwright/test";

function registrarErroresCriticos(page: import("@playwright/test").Page) {
  const errores: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errores.push(message.text());
  });
  page.on("pageerror", (error) => errores.push(error.message));
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

test.describe("Centro de pendientes", () => {
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
