import { expect, test } from "@playwright/test";

test("una ruta protegida redirige al inicio de sesión", async ({ page }) => {
  await page.goto("/requisitos-legales");

  await expect(page).toHaveURL(/\/login\?redirect=%2Frequisitos-legales$/);
  await expect(page.getByRole("heading", { name: "Iniciar sesión" })).toBeVisible();
});

test("el inicio de sesión conserva el destino solicitado", async ({ page }) => {
  await page.goto("/documentos/nuevo");

  await expect(page).toHaveURL(/\/login\?redirect=%2Fdocumentos%2Fnuevo$/);
  await expect(page.getByLabel("Email corporativo")).toBeVisible();
  await expect(page.getByLabel("Contraseña")).toBeVisible();
});
