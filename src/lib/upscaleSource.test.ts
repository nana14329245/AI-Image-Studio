import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { UPSCALE_MAX_OUTPUT_EDGE } from "./plans";
import { UpscaleInputError, isPrivateAddress, prepareUpscaleSource } from "./upscaleSource";

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.10",
    "169.254.169.254", // cloud instance metadata
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "::",
    "fd12:3456::1",
    "fe80::1",
    "::ffff:127.0.0.1",
    "::ffff:10.0.0.1",
    "not-an-ip",
  ])("refuses %s", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "172.15.255.255", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
    "allows public %s",
    (address) => {
      expect(isPrivateAddress(address)).toBe(false);
    }
  );
});

async function dataUrlFor(width: number, height: number, format: "png" | "jpeg" = "png", orientation?: number) {
  let image = sharp({ create: { width, height, channels: 3, background: { r: 200, g: 120, b: 40 } } });
  image = format === "png" ? image.png() : image.jpeg();
  if (orientation) image = image.withMetadata({ orientation });
  const buffer = await image.toBuffer();
  return `data:image/${format};base64,${buffer.toString("base64")}`;
}

describe("prepareUpscaleSource", () => {
  it("shrinks an upload so the upscaled result respects the size limit, and prices that result", async () => {
    const { image, plan } = await prepareUpscaleSource(await dataUrlFor(3000, 2000), 4);
    expect(plan.downscaled).toBe(true);
    expect(Math.max(plan.outputWidth, plan.outputHeight)).toBe(UPSCALE_MAX_OUTPUT_EDGE);

    // What is sent to fal.ai must actually be the planned size, or the bill will not match the charge.
    const sent = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
    expect(sent.format).toBe("jpeg");
    expect([sent.width, sent.height]).toEqual([plan.inputWidth, plan.inputHeight]);
  });

  it("leaves a small upload at its own size", async () => {
    const { image, plan } = await prepareUpscaleSource(await dataUrlFor(600, 400), 2);
    expect(plan.downscaled).toBe(false);
    const sent = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
    expect([sent.width, sent.height]).toEqual([600, 400]);
  });

  it("sizes a sideways-stored phone photo by its upright shape", async () => {
    // Stored 3000 wide by 2000 tall, but EXIF orientation 6 means it displays portrait.
    const { image, plan } = await prepareUpscaleSource(await dataUrlFor(3000, 2000, "jpeg", 6), 4);
    expect(plan.outputHeight).toBeGreaterThan(plan.outputWidth);
    const sent = await sharp(Buffer.from(await image.arrayBuffer())).metadata();
    expect(sent.height).toBeGreaterThan(sent.width ?? 0);
  });

  it("rejects bytes that are not a readable image with a message for the user", async () => {
    const junk = `data:image/png;base64,${Buffer.from("definitely not a png").toString("base64")}`;
    await expect(prepareUpscaleSource(junk, 2)).rejects.toBeInstanceOf(UpscaleInputError);
  });

  it("refuses links that are not public https before making any request", async () => {
    await expect(prepareUpscaleSource("http://example.com/a.png", 2)).rejects.toBeInstanceOf(UpscaleInputError);
    await expect(prepareUpscaleSource("https://127.0.0.1/a.png", 2)).rejects.toBeInstanceOf(UpscaleInputError);
    await expect(prepareUpscaleSource("https://169.254.169.254/latest/meta-data", 2)).rejects.toBeInstanceOf(UpscaleInputError);
    await expect(prepareUpscaleSource("https://[::1]/a.png", 2)).rejects.toBeInstanceOf(UpscaleInputError);
    await expect(prepareUpscaleSource("https://user:pass@example.com/a.png", 2)).rejects.toBeInstanceOf(UpscaleInputError);
    await expect(prepareUpscaleSource("https://localhost/a.png", 2)).rejects.toBeInstanceOf(UpscaleInputError);
  });
});
