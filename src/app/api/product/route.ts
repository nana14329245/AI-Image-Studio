import { NextRequest, NextResponse } from "next/server";
import { brandColorPromptHint, getBrandKit } from "@/lib/brandKit";
import {
  createGenerationContext,
  enqueueMultipleGenerations,
  failGeneration,
  isSupportedImageDataUrl,
  toFalImageInput,
} from "@/lib/imageGeneration";

export const maxDuration = 300;

const STYLES = ["Clean", "Minimal", "Luxury", "Home / Lifestyle", "Natural", "Marketplace"] as const;
const BACKGROUNDS = ["Studio", "Bathroom", "Living Room", "Nature", "Luxury", "Marketplace White"] as const;

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 6_000_000) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 4 MB" }, { status: 413 });

  let input: { imageUrl?: unknown; style?: unknown; background?: unknown };
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const { imageUrl, style, background } = input;
  if (!isSupportedImageDataUrl(imageUrl) || !STYLES.includes(style as (typeof STYLES)[number]) || !BACKGROUNDS.includes(background as (typeof BACKGROUNDS)[number])) {
    return NextResponse.json({ error: "กรุณาเลือกรูปสินค้า สไตล์ และพื้นหลังที่รองรับ" }, { status: 400 });
  }

  const context = await createGenerationContext(req, "product");
  if (context instanceof NextResponse) return context;

  try {
    const falImage = await toFalImageInput(imageUrl);
    const kit = await getBrandKit(context.supabase, context.userId);
    const brandHint = brandColorPromptHint(kit);
    const brandSuffix = brandHint ? ` ${brandHint}` : "";

    const anglePrompts = [
      `A single commercial product photograph of the product from a straight-on eye-level front view. High-end e-commerce product photography with a ${background} setting and ${style} studio lighting. Crisp focus, clean shadows, realistic reflections. Preserve exact product shape, colors, labels, and branding. Single full-frame image only, no collage, no split screen, no grid, no borders, no text, no watermark.${brandSuffix}`,
      `A single commercial product photograph of the product from a dynamic 45-degree three-quarter perspective angle showing side depth and dimension. High-end e-commerce product photography with a ${background} setting and ${style} studio lighting. Crisp focus, clean shadows, realistic reflections. Preserve exact product shape, colors, labels, and branding. Single full-frame image only, no collage, no split screen, no grid, no borders, no text, no watermark.${brandSuffix}`,
      `A single commercial product photograph of the product from an overhead top-down flatlay angle. Magazine editorial aesthetic with a ${background} setting and ${style} lighting. Crisp focus, clean shadows. Preserve exact product shape, colors, labels, and branding. Single full-frame image only, no collage, no split screen, no grid, no borders, no text, no watermark.${brandSuffix}`,
      `A single commercial product photograph of the product placed naturally in an ambient lifestyle in-context scene. Warm natural lighting with a ${background} setting and ${style} aesthetic. Realistic environment and depth of field. Preserve exact product shape, colors, labels, and branding. Single full-frame image only, no collage, no split screen, no grid, no borders, no text, no watermark.${brandSuffix}`,
    ];

    const inputs = anglePrompts.map(prompt => ({
      image_url: falImage,
      aspect_ratio: "1:1",
      num_images: 1,
      prompt,
    }));

    const queued = await enqueueMultipleGenerations(context, "fal-ai/flux-pro/kontext", inputs, {
      style,
      background,
      variations: 4,
    });
    return NextResponse.json(queued, { status: 202 });
  } catch (error) {
    console.error("fal.ai product generation failed", error);
    await failGeneration(context, error instanceof Error ? error.message : "generation_failed");
    const message = error instanceof Error && error.message ? error.message : "สร้างภาพสินค้าไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
