import { expect, test, type Page } from "@playwright/test";
import { expectsAnalyticsBanner } from "../support/env";

const BANNER = { name: "ความยินยอมการเก็บข้อมูลการใช้งาน" };

/** Names of everything PostHog keeps in this browser. */
async function analyticsStorage(page: Page): Promise<string[]> {
  const local = await page.evaluate(() => Object.keys(window.localStorage).filter((key) => key.startsWith("ph_")));
  const cookies = (await page.context().cookies()).map((cookie) => cookie.name).filter((name) => name.startsWith("ph_"));
  return [...local, ...cookies];
}

test.describe("analytics consent", () => {
  test.skip(!expectsAnalyticsBanner(), "needs a server built with a PostHog key; set E2E_EXPECT_ANALYTICS=1 for one");

  test.beforeEach(async ({ page }) => {
    // Nothing may reach an analytics service from a test run.
    await page.route(/posthog|127\.0\.0\.1:9\//, (route) => route.abort());
  });

  test("stores nothing until the visitor chooses, and refusing keeps it that way", async ({ page }) => {
    await page.goto("/");
    const banner = page.getByRole("region", BANNER);
    await expect(banner).toBeVisible();
    expect(await analyticsStorage(page)).toEqual([]);

    // Refusing is one click, the same as accepting.
    await banner.getByRole("button", { name: "ปฏิเสธ" }).click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.getByRole("region", BANNER)).toBeHidden();
    expect(await analyticsStorage(page)).toEqual([]);
  });

  test("withdrawing consent deletes what analytics stored", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("region", BANNER).getByRole("button", { name: "ยอมรับ" }).click();
    await expect.poll(() => analyticsStorage(page)).not.toEqual([]);

    await page.getByRole("navigation", { name: "ข้อมูลทางกฎหมาย" }).getByRole("button", { name: "ตั้งค่าคุกกี้" }).click();
    const banner = page.getByRole("region", BANNER);
    await expect(banner).toContainText("ตอนนี้: ยอมรับแล้ว");
    await banner.getByRole("button", { name: "ปฏิเสธ" }).click();

    await expect.poll(() => analyticsStorage(page)).toEqual([]);
  });
});

test("without an analytics key there is no banner to answer", async ({ page }) => {
  test.skip(expectsAnalyticsBanner(), "this server was built with an analytics key");
  test.skip(Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY), "a PostHog key is configured locally");
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("region", BANNER)).toBeHidden();
  await expect(page.getByRole("button", { name: "ตั้งค่าคุกกี้" })).toBeHidden();
});
