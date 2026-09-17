import { expect, test } from "@playwright/test";
import { PLANS, SIGNUP_CREDITS } from "../../src/lib/plans";

test.describe("landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("leads a visitor to sign up", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toContainText("ภาพสินค้ามืออาชีพ");
    const cta = page.getByRole("link", { name: `เริ่มต้นฟรี ${SIGNUP_CREDITS} เครดิต` });
    await expect(cta).toHaveAttribute("href", "/signup");
    await cta.click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: "สร้างบัญชีใหม่" })).toBeVisible();
  });

  test("shows every plan at the price the app charges", async ({ page }) => {
    const pricing = page.locator("section").filter({ has: page.getByRole("heading", { name: "เริ่มฟรี อัปเกรดเมื่อพร้อม" }) });
    for (const plan of PLANS) {
      await expect(pricing.getByText(plan.monthlyPriceLabel, { exact: true })).toBeVisible();
      for (const feature of plan.features) {
        await expect(pricing.getByRole("listitem").filter({ hasText: feature }).first()).toBeVisible();
      }
    }
  });

  test("links to every legal page from the footer", async ({ page }) => {
    const footer = page.getByRole("navigation", { name: "ข้อมูลทางกฎหมาย" });
    const pages = [
      { name: "ข้อตกลงการใช้บริการ", path: "/terms" },
      { name: "นโยบายความเป็นส่วนตัว", path: "/privacy" },
      { name: "นโยบายการยกเลิกและคืนเงิน", path: "/refund" },
      { name: "ติดต่อเรา", path: "/contact" },
    ];
    for (const { name, path } of pages) {
      await expect(footer.getByRole("link", { name })).toHaveAttribute("href", path);
    }

    await footer.getByRole("link", { name: "นโยบายความเป็นส่วนตัว" }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole("heading", { level: 1, name: "นโยบายความเป็นส่วนตัว" })).toBeVisible();
  });
});
