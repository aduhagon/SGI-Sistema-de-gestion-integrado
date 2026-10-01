import { expect, test as setup } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const authFile = ".playwright/auth/admin.json";

setup("autenticar cuenta E2E", async ({ page }) => {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Faltan E2E_ADMIN_EMAIL y E2E_ADMIN_PASSWORD. Usá una cuenta exclusiva de pruebas.",
    );
  }

  await page.goto("/login");
  await page.getByLabel("Email corporativo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).not.toHaveURL(/\/login(?:\?|$)/);
  await mkdir(".playwright/auth", { recursive: true });
  await page.context().storageState({ path: authFile });
});
