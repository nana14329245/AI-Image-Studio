import { NextRequest, NextResponse } from "next/server";
import { MAX_IMAGE_REQUEST_BODY_CHARS } from "@/lib/uploadLimits";
import { brandColorPromptHint, getBrandKit } from "@/lib/brandKit";
import {
  createGenerationContext,
  enqueueGeneration,
  failGeneration,
  isSupportedImageDataUrl,
  toFalImageInput,
} from "@/lib/imageGeneration";
import {
  PORTRAIT_BACKGROUNDS,
  PORTRAIT_BACKGROUND_HEX,
  PORTRAIT_CAREERS,
  PORTRAIT_SIZES,
  PORTRAIT_SIZES_WITH_LOCKED_FACE,
  isAllowedOption,
} from "@/lib/toolOptions";

export const maxDuration = 300;

const ASPECT_RATIOS = { Resume: "3:4", "1 × 1": "1:1", Passport: "3:4" } as const;

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > MAX_IMAGE_REQUEST_BODY_CHARS) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาเลือกภาพใหม่อีกครั้ง ระบบจะย่อให้อัตโนมัติ" }, { status: 413 });

  let input: { imageUrl?: unknown; career?: unknown; background?: unknown; size?: unknown };
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const { imageUrl, career, background, size } = input;
  if (
    !isSupportedImageDataUrl(imageUrl) ||
    !isAllowedOption(PORTRAIT_CAREERS, career) ||
    !isAllowedOption(PORTRAIT_BACKGROUNDS, background) ||
    !isAllowedOption(PORTRAIT_SIZES, size)
  ) {
    return NextResponse.json({ error: "กรุณาเลือกรูป ประเภทงาน พื้นหลัง และขนาดที่รองรับ" }, { status: 400 });
  }

  // Passport and 1 × 1 never run a generative model on the face (see
  // PORTRAIT_SIZES_WITH_LOCKED_FACE), so only a flat color background makes
  // sense for them — "Office" is a scene an AI paints, not a color to composite.
  const lockFace = PORTRAIT_SIZES_WITH_LOCKED_FACE.has(size);
  const backgroundHex = PORTRAIT_BACKGROUND_HEX[background as string];
  if (lockFace && !backgroundHex) {
    return NextResponse.json({ error: "รูปพาสปอร์ตและ 1×1 เลือกได้เฉพาะพื้นขาว พื้นเทา หรือพื้นน้ำเงิน" }, { status: 400 });
  }

  const context = await createGenerationContext(req, "portrait");
  if (context instanceof NextResponse) return context;

  try {
    if (lockFace) {
      // Only the background changes; the person's photo goes through untouched
      // otherwise. See src/lib/portraitBackground.ts for the composite step,
      // which runs once this queued job completes.
      const queued = await enqueueGeneration(context, "fal-ai/bria/background/remove", {
        image_url: await toFalImageInput(imageUrl),
      }, {
        mode: "solid_background",
        backgroundHex,
        aspectRatio: ASPECT_RATIOS[size as keyof typeof ASPECT_RATIOS],
        career,
        background,
        size,
      });
      return NextResponse.json(queued, { status: 202 });
    }

    const kit = await getBrandKit(context.supabase, context.userId);
    const brandHint = brandColorPromptHint(kit);
    const queued = await enqueueGeneration(context, "fal-ai/flux-pro/kontext", {
      image_url: await toFalImageInput(imageUrl),
      aspect_ratio: ASPECT_RATIOS[size as keyof typeof ASPECT_RATIOS],
      num_images: 1,
      // guidance_scale raised from the 3.5 default: this is an edit, not a
      // repaint, and the identity-preservation sentence needs to be followed
      // as literally as the background/attire instructions are.
      guidance_scale: 4.5,
      prompt: `Edit this exact photo of this exact person. Do not change their face: keep the identical facial structure, eyes, nose, mouth, skin tone, and ethnicity — the output must be recognizable as the same individual, not a different person who merely resembles them. Only change: clothing to polished professional attire appropriate for ${career}, background to a clean ${background} setting, and lighting to flattering studio lighting. Natural, professional ${career} headshot, realistic photographic result. No text, logos, or watermarks.${brandHint ? ` ${brandHint}` : ""}`,
    }, { career, background, size });
    return NextResponse.json(queued, { status: 202 });
  } catch (error) {
    console.error("fal.ai portrait generation failed", error);
    await failGeneration(context, error instanceof Error ? error.message : "generation_failed");
    return NextResponse.json({ error: "สร้างภาพโปรไฟล์ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง" }, { status: 502 });
  }
}
