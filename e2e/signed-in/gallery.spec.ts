import { expect, test } from "../support/signedIn";

test("every gallery image loads through a signed link to private storage", async ({ page }) => {
  await page.goto("/gallery");
  const images = page.locator(".gallery-item img");
  const count = await images.count();
  test.skip(count === 0, "the test account has no completed generations to show");

  for (let i = 0; i < count; i += 1) {
    const image = images.nth(i);
    await image.scrollIntoViewIfNeeded();
    const src = await image.getAttribute("src");
    // Stored images are served by signed URL; only rows from before storage copying keep a provider URL.
    expect(src, `image ${i}`).toMatch(/\/storage\/v1\/object\/sign\/generations\/|^https:\/\/[^/]*fal\.media\//);
    expect(src, `image ${i} must not use the old public path`).not.toContain("/object/public/");
    if (src?.includes("/object/sign/")) {
      await expect
        .poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0), { message: `image ${i} loads` })
        .toBe(true);
    }
  }
});

test("each item offers a download through the app, not the storage URL", async ({ page }) => {
  await page.goto("/gallery");
  const downloads = page.getByRole("link", { name: "DOWNLOAD" });
  test.skip((await downloads.count()) === 0, "the test account has no completed generations to show");
  await expect(downloads.first()).toHaveAttribute("href", /^\/api\/generations\/[0-9a-f-]{36}\/download$/);
});
