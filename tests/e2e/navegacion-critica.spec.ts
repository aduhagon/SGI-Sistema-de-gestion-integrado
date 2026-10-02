import { expect, test } from "@playwright/test";

const rutasCriticas = [
  { ruta: "/documentos", titulo: "Documentos" },
  { ruta: "/requisitos-legales", titulo: "Requisitos legales" },
  { ruta: "/cumplimiento", titulo: /Panorama de cobertura documental|Matriz de cobertura documental/ },
  { ruta: "/sistema", titulo: "Configuración del sistema" },
] as const;

for (const { ruta, titulo } of rutasCriticas) {
  test(`${ruta} carga sin textos dañados`, async ({ page }) => {
    const browserErrors: string[] = [];
    page.on("pageerror", (error) => browserErrors.push(error.message));

    const response = await page.goto(ruta, { waitUntil: "domcontentloaded" });

    expect(response, `${ruta} no devolvió una respuesta HTTP`).not.toBeNull();
    expect(response?.status(), `${ruta} respondió con error HTTP`).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: titulo }).first()).toBeVisible();

    const visibleText = await page.locator("body").innerText();
    expect(visibleText).not.toMatch(/\u00c3|\u00c2|\u00e2\u20ac|\ufffd/);
    expect(browserErrors, `Errores del navegador en ${ruta}: ${browserErrors.join(" | ")}`).toEqual([]);
  });
}
