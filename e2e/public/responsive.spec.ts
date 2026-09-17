import { expect, test } from "@playwright/test";

// Runs in both the desktop and the phone-sized project.
for (const path of ["/", "/login", "/signup", "/terms", "/privacy", "/refund", "/contact"]) {
  test(`${path} has no sideways scrolling`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
