import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
const againstRemote = Boolean(process.env.E2E_BASE_URL);
const isCI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // En CI evitamos reportes y adjuntos que puedan conservar valores escritos
  // en formularios sensibles. Localmente mantenemos las evidencias visuales.
  reporter: isCI ? [["list"]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: isCI ? "off" : "retain-on-failure",
    screenshot: isCI ? "off" : "only-on-failure",
    video: isCI ? "off" : "retain-on-failure",
  },
  projects: [
    {
      name: "public",
      testMatch: /(public|production-smoke)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "desktop",
      dependencies: ["setup"],
      testIgnore: /public\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".playwright/auth/admin.json",
      },
    },
    {
      name: "mobile",
      dependencies: ["setup"],
      testIgnore: /public\.spec\.ts/,
      use: {
        ...devices["Pixel 7"],
        storageState: ".playwright/auth/admin.json",
      },
    },
  ],
  webServer: againstRemote
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
