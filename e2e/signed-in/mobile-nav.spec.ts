import { expect, test } from "../support/signedIn";

test("the phone menu opens, navigates, and closes", async ({ page }) => {
  await page.goto("/dashboard");
  const toggle = page.getByRole("button", { name: "เปิดเมนู" });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.click();
  const drawer = page.locator("#mobile-nav-drawer");
  await expect(page.getByRole("button", { name: "ปิดเมนู" })).toHaveAttribute("aria-expanded", "true");
  await expect(drawer).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "เปิดเมนู" })).toBeFocused();

  await page.getByRole("button", { name: "เปิดเมนู" }).click();
  await drawer.getByRole("link", { name: "Gallery", exact: true }).click();
  await expect(page).toHaveURL(/\/gallery$/);
  await expect(page.getByRole("button", { name: "เปิดเมนู" })).toHaveAttribute("aria-expanded", "false");
});

test("the credit badge in the phone header links to the account page", async ({ page }) => {
  await page.goto("/dashboard");
  const badge = page.getByRole("link", { name: /^เครดิตคงเหลือ \d+/ });
  await expect(badge).toHaveAttribute("href", "/account");
});
