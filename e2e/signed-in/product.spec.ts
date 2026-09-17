import { largeNoisyPng, solidImageDataUrl } from "../support/mockApi";
import { expect, test } from "../support/signedIn";
import { GENERATION_UPLOAD_MAX_EDGE, MAX_UPLOAD_DATA_URL_CHARS } from "../../src/lib/uploadLimits";

const GENERATION_ID = "00000000-0000-4000-8000-00000000e2e0";

test.describe("Product Studio", () => {
  test("shrinks a phone-sized photo, shows progress, and presents four angles", async ({ page }) => {
    const photo = await largeNoisyPng();
    expect(photo.length).toBeGreaterThan(MAX_UPLOAD_DATA_URL_CHARS); // would not fit in one request as it is

    const results = await Promise.all(["#e4572e", "#29335c", "#f3a712", "#669bbc"].map((color) => solidImageDataUrl(color)));
    const captured: { request?: { imageUrl: string; style: string; background: string; bodyLength: number } } = {};
    let polls = 0;

    await page.route("**/api/product", async (route) => {
      const body = route.request().postData() ?? "";
      captured.request = { ...JSON.parse(body), bodyLength: body.length };
      await route.fulfill({ json: { generationId: GENERATION_ID } });
    });
    await page.route(`**/api/generations/${GENERATION_ID}/status`, async (route) => {
      polls += 1;
      await route.fulfill({
        json:
          polls <= 2
            ? { status: "generating", progress: 55, message: "AI กำลังสร้างภาพ 2/4 มุมมอง" }
            : { status: "completed", progress: 100, result: results[0], results, generationId: GENERATION_ID, creditsRemaining: 100 },
      });
    });

    await page.goto("/product");
    await page.locator('input[type="file"]').setInputFiles({ name: "phone-photo.png", mimeType: "image/png", buffer: photo });
    await expect(page.getByText("พร้อมสร้างภาพแล้ว")).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /สร้างภาพสินค้า 4 มุมมอง/ }).click();
    await expect(page.getByRole("status").filter({ hasText: "AI กำลังสร้างภาพ 2/4 มุมมอง" })).toBeVisible();

    // Four angle thumbnails, the first one selected and shown.
    const thumbnails = page.getByRole("button").filter({ has: page.locator("img") }).filter({ hasText: /0[1-4] \// });
    await expect(thumbnails).toHaveCount(4, { timeout: 15_000 });
    await expect(page.getByRole("img", { name: /ภาพที่สร้าง — มุมตรงด้านหน้า/ })).toBeVisible();

    await thumbnails.nth(2).click();
    await expect(page.getByRole("img", { name: /ภาพที่สร้าง — มุมท็อป/ })).toHaveAttribute("src", results[2]);
    await expect(page.getByRole("link", { name: "ดาวน์โหลดมุมนี้ ↓" })).toHaveAttribute(
      "href",
      `/api/generations/${GENERATION_ID}/download?index=2`
    );

    // Before/after comparison.
    const compare = page.getByRole("group", { name: "สลับดูภาพต้นฉบับกับผลลัพธ์" });
    await compare.getByRole("button", { name: "ต้นฉบับ" }).click();
    await expect(page.getByRole("img", { name: "ภาพต้นฉบับที่อัปโหลด" })).toBeVisible();
    await compare.getByRole("button", { name: "ผลลัพธ์" }).click();
    await expect(page.getByRole("img", { name: /ภาพที่สร้าง/ })).toBeVisible();

    // What was sent: shrunk to fit one request, within the edge limit, re-encoded.
    const sent = captured.request;
    if (!sent) throw new Error("the page never submitted the product request");
    expect(sent.bodyLength).toBeLessThanOrEqual(MAX_UPLOAD_DATA_URL_CHARS + 200);
    expect(sent.imageUrl).toMatch(/^data:image\/(webp|jpeg);base64,/);
    const dimensions = await page.evaluate(async (src) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      return { width: image.naturalWidth, height: image.naturalHeight };
    }, sent.imageUrl);
    expect(Math.max(dimensions.width, dimensions.height)).toBeLessThanOrEqual(GENERATION_UPLOAD_MAX_EDGE);
    expect(dimensions.width / dimensions.height).toBeCloseTo(2600 / 2000, 2);
  });

  test("shows the server's reason when there are not enough credits", async ({ page }) => {
    await page.route("**/api/product", (route) =>
      route.fulfill({ status: 402, json: { error: "เครดิตไม่พอ ต้องใช้ 24 เครดิตสำหรับการสร้างภาพนี้" } })
    );
    await page.goto("/product");
    await page.locator('input[type="file"]').setInputFiles({
      name: "small.png",
      mimeType: "image/png",
      buffer: Buffer.from((await solidImageDataUrl("#336699", 400)).split(",")[1], "base64"),
    });
    await page.getByRole("button", { name: /สร้างภาพสินค้า 4 มุมมอง/ }).click();
    await expect(page.getByRole("alert")).toHaveText("เครดิตไม่พอ ต้องใช้ 24 เครดิตสำหรับการสร้างภาพนี้");
  });

  test("refuses a file type it cannot process without uploading anything", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/api/")) requests.push(request.url());
    });
    await page.goto("/product");
    await page.locator('input[type="file"]').setInputFiles({ name: "animation.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a") });
    await expect(page.getByRole("alert")).toHaveText("รองรับไฟล์ JPG, PNG และ WebP เท่านั้น");
    await expect(page.getByRole("button", { name: /สร้างภาพสินค้า 4 มุมมอง/ })).toBeDisabled();
    expect(requests).toEqual([]);
  });
});
