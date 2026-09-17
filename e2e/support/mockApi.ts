import type { Page, Request } from "@playwright/test";
import { randomFillSync } from "node:crypto";
import sharp from "sharp";

/**
 * Answers every request that would spend credits, touch billing, or delete the
 * account inside the browser, before it reaches the app's server. Registered
 * before each signed-in test so a mistake in a test cannot generate images,
 * change a subscription, or delete the test account. Tests that need a
 * specific answer register their own route afterwards, which takes precedence.
 */
export async function blockSpendingRequests(page: Page): Promise<Request[]> {
  const blocked: Request[] = [];
  const refuse = async (route: import("@playwright/test").Route) => {
    blocked.push(route.request());
    await route.fulfill({ status: 418, json: { error: "e2e: blocked by blockSpendingRequests" } });
  };
  await page.route(/\/api\/(upscale|product|ads|portrait)(\?|$)/, refuse);
  await page.route(/\/api\/billing\//, refuse);
  await page.route(/\/api\/account\/delete(\?|$)/, refuse);
  await page.route(/\/api\/brand-kit(\?|$)/, async (route) => {
    if (route.request().method() === "GET") return route.continue();
    return refuse(route);
  });
  return blocked;
}

/** A small solid-colour PNG as a data URL, standing in for a generated result. */
export async function solidImageDataUrl(color: string, size = 96): Promise<string> {
  const buffer = await sharp({ create: { width: size, height: size, channels: 3, background: color } }).png().toBuffer();
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

/**
 * A photo-sized PNG of random noise: noise barely compresses, so the file is as
 * large as a real phone photo, and far past what fits in one request unshrunk.
 */
export async function largeNoisyPng(width = 2600, height = 2000): Promise<Buffer> {
  const pixels = randomFillSync(Buffer.alloc(width * height * 3));
  return sharp(pixels, { raw: { width, height, channels: 3 } }).png({ compressionLevel: 1 }).toBuffer();
}
