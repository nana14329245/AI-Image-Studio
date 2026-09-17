import { expect, test } from "@playwright/test";

const PROTECTED_PAGES = ["/dashboard", "/upscale", "/product", "/ads", "/portrait", "/gallery", "/account", "/promotions", "/brand-kit"];

test.describe("signed-out access", () => {
  for (const path of PROTECTED_PAGES) {
    test(`${path} sends a signed-out visitor to login and remembers where they were going`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(`/login?next=${encodeURIComponent(path)}`);
      await expect(page.getByRole("heading", { name: "เข้าสู่ระบบ" })).toBeVisible();
    });
  }

  test("generation API refuses a signed-out request instead of running it", async ({ request }) => {
    const response = await request.post("/api/product", {
      data: { imageUrl: "data:image/png;base64,AAAA", style: "Clean", background: "Studio" },
      maxRedirects: 0,
    });
    expect(response.status()).toBe(307);
    expect(response.headers().location).toContain("/login");
  });

  test("the Stripe webhook rejects an unsigned event", async ({ request }) => {
    const response = await request.post("/api/webhooks/stripe", {
      data: { type: "customer.subscription.deleted", data: { object: {} } },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe("signup form", () => {
  test("links the terms and privacy policy the visitor is agreeing to", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("link", { name: "ข้อตกลงการใช้บริการ", exact: true })).toHaveAttribute("href", "/terms");
    await expect(page.getByRole("link", { name: "นโยบายความเป็นส่วนตัว", exact: true })).toHaveAttribute("href", "/privacy");
  });

  test("does not send a password shorter than 8 characters to Supabase", async ({ page }) => {
    const signupCalls: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/auth/v1/signup")) signupCalls.push(request.url());
    });

    await page.goto("/signup");
    await page.getByLabel("อีเมล").fill("e2e-short-password@example.com");
    await page.getByLabel("รหัสผ่าน").fill("short");
    await page.getByRole("button", { name: "สมัครสมาชิก" }).click();

    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { name: "สร้างบัญชีใหม่" })).toBeVisible();
    expect(signupCalls).toEqual([]);
  });
});
