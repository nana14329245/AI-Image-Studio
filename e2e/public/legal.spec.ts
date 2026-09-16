import { expect, test } from "@playwright/test";
import { CREDIT_ROLLOVER_MONTHS, PLANS, SIGNUP_CREDITS, TOOL_CREDIT_COST } from "../../src/lib/plans";

const LEGAL_PAGES = [
  { path: "/terms", title: "ข้อตกลงการใช้บริการ" },
  { path: "/privacy", title: "นโยบายความเป็นส่วนตัว" },
  { path: "/refund", title: "นโยบายการยกเลิกและคืนเงิน" },
  { path: "/contact", title: "ติดต่อเรา" },
];

test.describe("legal pages", () => {
  for (const { path, title } of LEGAL_PAGES) {
    test(`${path} is public and marks itself in the page tabs`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      // Not bounced to /login: these must be readable before signing up.
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page).toHaveTitle(new RegExp(title));
      await expect(page.getByRole("heading", { level: 1, name: title })).toBeVisible();
      const tabs = page.getByRole("navigation", { name: "เอกสารทางกฎหมาย" });
      await expect(tabs.getByRole("link", { name: title })).toHaveAttribute("aria-current", "page");
    });
  }

  test("terms quote the credit costs, prices and rollover the app actually uses", async ({ page }) => {
    await page.goto("/terms");
    const credits = page.locator("#credits");
    await expect(credits).toContainText(`Product Studio: ${TOOL_CREDIT_COST.product} เครดิตต่อครั้ง`);
    await expect(credits).toContainText(`Ad Studio: ${TOOL_CREDIT_COST.ads} เครดิตต่อครั้ง`);
    await expect(credits).toContainText(`Professional Photo: ${TOOL_CREDIT_COST.portrait} เครดิตต่อครั้ง`);
    await expect(credits).toContainText(`${SIGNUP_CREDITS} เครดิตครั้งเดียวเมื่อสมัคร`);

    const subscription = page.locator("#subscription");
    for (const plan of PLANS.filter((p) => p.id !== "free")) {
      await expect(subscription).toContainText(`${plan.name} ${plan.monthlyPriceLabel}`);
    }
    await expect(subscription).toContainText(`ไม่เกิน ${CREDIT_ROLLOVER_MONTHS} เท่า`);
  });

  test("terms say no tax invoice can be issued", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.locator("#provider")).toContainText("ไม่สามารถออกใบกำกับภาษีได้");
  });

  test("the sitemap lists the legal pages", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const xml = await response.text();
    for (const { path } of LEGAL_PAGES) {
      expect(xml).toContain(`${path}</loc>`);
    }
  });
});
