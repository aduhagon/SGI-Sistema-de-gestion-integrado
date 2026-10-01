import { expect, test } from "@playwright/test";

test("producción responde y permite llegar al inicio de sesión", async ({ page }) => {
  const browserErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const response = await page.goto("/dashboard", {
    waitUntil: "domcontentloaded",
  });

  expect(response, "La aplicación no devolvió una respuesta HTTP").not.toBeNull();
  expect(response?.status(), "La aplicación respondió con un error HTTP").toBeLessThan(400);
  await expect(page).toHaveURL(/\/login\?redirect=%2Fdashboard$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
  await expect(page.getByLabel("Email corporativo")).toBeEditable();
  await expect(page.getByLabel("Contraseña")).toBeEditable();
  await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeEnabled();

  expect(browserErrors, "Errores críticos del navegador: " + browserErrors.join(" | ")).toEqual([]);
});
