import { expect, test } from "@playwright/test";

test("el alta documental ofrece solo certificaciones y estándares", async ({ page }) => {
  await page.goto("/documentos/nuevo");

  await expect(page.getByText("Certificaciones y estándares", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Ley 18.284 (CAA)", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Decreto 2126/71", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Resolución Conjunta 2/2023", { exact: true })).toHaveCount(0);
});
