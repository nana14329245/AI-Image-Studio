/**
 * Turns a background-removed cutout (transparent PNG, from fal-ai/bria/background/remove)
 * into a framed, flat-background headshot at the target aspect ratio — the
 * whole "lock the face" path for Passport and 1 × 1 sizes in Professional
 * Photo. No generative model runs on the face here; this is pure compositing.
 */

const OUTPUT_LONG_EDGE = 1600;
const SUBJECT_HEIGHT_FRACTION = 0.9;

export type PortraitAspectRatio = "3:4" | "1:1";

function canvasSize(aspectRatio: PortraitAspectRatio): { width: number; height: number } {
  const [wRatio, hRatio] = aspectRatio === "1:1" ? [1, 1] : [3, 4];
  const height = OUTPUT_LONG_EDGE;
  const width = Math.round((height * wRatio) / hRatio);
  return { width, height };
}

export async function compositeOntoSolidBackground(
  cutout: Blob,
  backgroundHex: string,
  aspectRatio: PortraitAspectRatio
): Promise<Blob> {
  const sharp = (await import("sharp")).default;
  const buffer = Buffer.from(await cutout.arrayBuffer());
  const source = sharp(buffer);
  const meta = await source.metadata();
  if (!meta.width || !meta.height) throw new Error("Unable to read cutout dimensions");

  const { width: canvasWidth, height: canvasHeight } = canvasSize(aspectRatio);

  // Fit the subject within the canvas, constrained by whichever dimension is
  // tighter — a close-up crop is usually taller than wide, but this guards a
  // wide one too instead of overflowing the canvas on composite.
  let subjectHeight = Math.round(canvasHeight * SUBJECT_HEIGHT_FRACTION);
  let subjectWidth = Math.round(meta.width * (subjectHeight / meta.height));
  if (subjectWidth > canvasWidth) {
    subjectWidth = canvasWidth;
    subjectHeight = Math.round(meta.height * (subjectWidth / meta.width));
  }

  const resizedCutout = await sharp(buffer).resize({ width: subjectWidth, height: subjectHeight, fit: "inside" }).toBuffer();
  const left = Math.max(0, Math.round((canvasWidth - subjectWidth) / 2));
  // Anchored toward the bottom, not centered: a headshot needs headroom above
  // the subject, not equal margin top and bottom.
  const top = Math.max(0, canvasHeight - subjectHeight);

  const composited = await sharp({
    create: { width: canvasWidth, height: canvasHeight, channels: 3, background: backgroundHex },
  })
    .composite([{ input: resizedCutout, left, top }])
    .modulate({ brightness: 1.04 })
    .sharpen({ sigma: 0.4 })
    .jpeg({ quality: 95 })
    .toBuffer();

  return new Blob([new Uint8Array(composited)], { type: "image/jpeg" });
}
