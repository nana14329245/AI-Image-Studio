import { defineConfig, devices } from "@playwright/test";
import { AUTH_STATE_FILE, hasTestUser } from "./e2e/support/env";

/**
 * End-to-end tests. Two groups:
 *
 * - public: pages a signed-out visitor sees. Needs no accounts or keys, so it runs
 *   in CI against a production build.
 * - signed-in: the app behind the login. Runs only when E2E_EMAIL and E2E_PASSWORD
 *   name a test account (put them in .env.local, never in a committed file).
 *   Image generation and billing requests are answered by the test itself, so a
 *   run spends no credits and charges nothing.
 *
 * Locally the tests reuse the dev server on port 3000 if one is running.
 */
const port = Number(process.env.E2E_PORT ?? 3000);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;
const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : undefined,
  reporter: ci ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    locale: "th-TH",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "public", testDir: "e2e/public", use: { ...devices["Desktop Chrome"] } },
    { name: "public-mobile", testDir: "e2e/public", testMatch: /responsive\.spec\.ts/, use: { ...devices["Pixel 7"] } },
    ...(hasTestUser()
      ? [
          { name: "sign-in", testDir: "e2e", testMatch: /auth\.setup\.ts/ },
          {
            name: "signed-in",
            testDir: "e2e/signed-in",
            testIgnore: /mobile/,
            dependencies: ["sign-in"],
            use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE_FILE },
          },
          {
            name: "signed-in-mobile",
            testDir: "e2e/signed-in",
            testMatch: /mobile.*\.spec\.ts/,
            dependencies: ["sign-in"],
            use: { ...devices["Pixel 7"], storageState: AUTH_STATE_FILE },
          },
        ]
      : []),
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: ci ? `npm run start -- -p ${port}` : "npm run dev",
        url: baseURL,
        reuseExistingServer: !ci,
        timeout: 180_000,
      },
});
