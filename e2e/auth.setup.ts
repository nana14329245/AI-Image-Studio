import { expect, test as setup } from "@playwright/test";
import { AUTH_STATE_FILE } from "./support/env";

// Signs in once through the real login form and saves the session for the
// signed-in projects. Use a dedicated test account, not your own: the tests only
// read and never spend, but a test account keeps real data out of screenshots
// and traces.
setup("sign in with the test account", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(process.env.E2E_EMAIL!);
  await page.getByLabel("รหัสผ่าน").fill(process.env.E2E_PASSWORD!);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20_000 });
  await page.context().storageState({ path: AUTH_STATE_FILE });
});
