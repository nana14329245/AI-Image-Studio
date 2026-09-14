import { NextRequest, NextResponse } from "next/server";
import {
  createGenerationContext,
  enqueueGeneration,
  failGeneration,
  isSupportedImageDataUrl,
  toFalImageInput,
} from "@/lib/imageGeneration";

export const maxDuration = 300;

const PLATFORMS = ["Facebook", "Instagram", "Shopee", "Lazada", "TikTok"] as const;
const FORMATS = ["1:1", "4:5", "16:9", "9:16"] as const;
const ASPECT_RATIOS = { "1:1": "1:1", "4:5": "3:4", "16:9": "16:9", "9:16": "9:16" } as const;

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 6_000_000) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 4 MB" }, { status: 413 });

  let input: { imageUrl?: unknown; productName?: unknown; benefits?: unknown; platform?: unknown; format?: unknown };
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const { imageUrl, productName, benefits, platform, format } = input;
  if (
    !isSupportedImageDataUrl(imageUrl) ||
    typeof productName !== "string" ||
    productName.length > 120 ||
    typeof benefits !== "string" ||
    benefits.length > 500 ||
    !PLATFORMS.includes(platform as (typeof PLATFORMS)[number]) ||
    !FORMATS.includes(format as (typeof FORMATS)[number])
  ) {
    return NextResponse.json({ error: "กรุณาเลือกรูปและกรอกข้อมูลโฆษณาให้ถูกต้อง" }, { status: 400 });
  }

  const context = await createGenerationContext(req, "ads");
  if (context instanceof NextResponse) return context;
  const aspectRatio = ASPECT_RATIOS[format as keyof typeof ASPECT_RATIOS];

  try {
    const queued = await enqueueGeneration(context, "fal-ai/flux-pro/kontext", {
      image_url: await toFalImageInput(imageUrl),
      aspect_ratio: aspectRatio,
      num_images: 1,
      prompt: `Create one premium ${platform} advertising image for ${productName || "the product in the reference image"}. Preserve the exact product's shape, color, branding, and details. Showcase these benefits visually: ${benefits || "high quality and everyday usefulness"}. Use a compelling commercial composition with clear negative space for separately overlaid copy. Do not render text, letters, logos, or watermarks in the image.`,
    }, { productName, benefits, platform, format });
    return NextResponse.json(queued, { status: 202 });
  } catch (error) {
    console.error("fal.ai ad generation failed", error);
    await failGeneration(context, error instanceof Error ? error.message : "generation_failed");
    return NextResponse.json({ error: "สร้างภาพโฆษณาไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง" }, { status: 502 });
  }
}
