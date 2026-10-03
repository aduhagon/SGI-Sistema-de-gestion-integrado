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

  const failedRequests: string[] = [];
  page.on("requestfailed", (request) => {
    const url = new URL(request.url());
    failedRequests.push(`${url.origin}${url.pathname}: ${request.failure()?.errorText ?? "error desconocido"}`);
  });

  await page.goto("/login");
  await page.getByLabel("Email corporativo").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Ingresar" }).click();

  try {
    await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 15_000 });
  } catch (navigationError) {
    const alert = page.getByRole("alert").filter({ hasText: /\S/ }).first();
    if (await alert.isVisible()) {
      const networkDetail = failedRequests.length > 0
        ? ` Solicitudes fallidas: ${failedRequests.join("; ")}`
        : "";
      throw new Error(`El SGI rechazó el acceso E2E: ${await alert.innerText()}.${networkDetail}`);
    }

    throw navigationError;
  }
  await mkdir(".playwright/auth", { recursive: true });
  await page.context().storageState({ path: authFile });
});
