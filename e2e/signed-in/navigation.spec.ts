import { expect, test } from "../support/signedIn";

const PAGES = [
  { link: "Dashboard", path: "/dashboard", heading: /Better images/ },
  { link: "4K Upscale", path: "/upscale" },
  { link: "Product Studio", path: "/product", heading: /From ordinary/ },
  { link: "Ad Studio", path: "/ads" },
  { link: "Professional Photo", path: "/portrait" },
  { link: "Gallery", path: "/gallery", heading: /Everything you/ },
  { link: "Account", path: "/account" },
  { link: "Promotions", path: "/promotions" },
  { link: "Brand Kit", path: "/brand-kit", heading: /Every image/ },
];

test("every page in the sidebar opens and marks itself as current", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/dashboard");
  const sidebar = page.locator("aside").getByRole("navigation", { name: "Main navigation" });
  for (const { link, path, heading } of PAGES) {
    await sidebar.getByRole("link", { name: link, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(sidebar.getByRole("link", { name: link, exact: true })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (heading) await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
  }
  expect(errors).toEqual([]);
});

test("a signed-in visitor opening login or signup lands on the dashboard", async ({ page }) => {
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/dashboard$/);
  }
});
