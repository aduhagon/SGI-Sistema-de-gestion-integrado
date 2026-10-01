import { expect, test } from "@playwright/test";

test("separa el marco legal de las certificaciones", async ({ page }) => {
  await page.goto("/requisitos-legales");

  await expect(page.getByRole("heading", { name: "Requisitos legales" })).toBeVisible();
  await expect(page.getByText("Certificación:", { exact: true })).toBeVisible();

  const editar = page.getByRole("button", { name: "Editar", exact: true }).first();
  await expect(editar).toBeVisible();
  await editar.click();

  await expect(page.getByRole("heading", { name: "Editar requisito legal" })).toBeVisible();
  await expect(page.getByLabel("Ley, decreto o resolución de origen")).toBeVisible();
  await expect(page.getByText("Certificaciones aplicables")).toBeVisible();
});

test("la tarjeta móvil mantiene acciones utilizables", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Control específico de la vista móvil");
  await page.goto("/requisitos-legales");

  const primeraTarjeta = page.locator("article").first();
  await expect(primeraTarjeta).toBeVisible();
  await expect(primeraTarjeta.getByRole("button", { name: "Evaluar" })).toBeVisible();
  await expect(primeraTarjeta.getByRole("button", { name: "Editar" })).toBeVisible();
});
