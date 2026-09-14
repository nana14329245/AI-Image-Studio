import { NextRequest, NextResponse } from "next/server";
import {
  createGenerationContext,
  enqueueGeneration,
  failGeneration,
  isSupportedImageDataUrl,
  toFalImageInput,
} from "@/lib/imageGeneration";

export const maxDuration = 300;

const CAREERS = ["Office", "IT", "Banking", "Hotel", "Sales", "Student"] as const;
const BACKGROUNDS = ["White", "Gray", "Blue", "Office"] as const;
const SIZES = ["Resume", "1 × 1", "Passport"] as const;
const ASPECT_RATIOS = { Resume: "3:4", "1 × 1": "1:1", Passport: "3:4" } as const;

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 6_000_000) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 4 MB" }, { status: 413 });

  let input: { imageUrl?: unknown; career?: unknown; background?: unknown; size?: unknown };
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const { imageUrl, career, background, size } = input;
  if (
    !isSupportedImageDataUrl(imageUrl) ||
    !CAREERS.includes(career as (typeof CAREERS)[number]) ||
    !BACKGROUNDS.includes(background as (typeof BACKGROUNDS)[number]) ||
    !SIZES.includes(size as (typeof SIZES)[number])
  ) {
    return NextResponse.json({ error: "กรุณาเลือกรูป ประเภทงาน พื้นหลัง และขนาดที่รองรับ" }, { status: 400 });
  }

  const context = await createGenerationContext(req, "portrait");
  if (context instanceof NextResponse) return context;

  try {
    const queued = await enqueueGeneration(context, "fal-ai/flux-pro/kontext", {
      image_url: await toFalImageInput(imageUrl),
      aspect_ratio: ASPECT_RATIOS[size as keyof typeof ASPECT_RATIOS],
      num_images: 1,
      prompt: `Create a natural, professional ${career} headshot from the reference image. Preserve the person's identity, facial features, hairstyle, skin tone, and expression. Use a clean ${background} background, flattering studio lighting, polished professional attire appropriate for ${career}, and a realistic photographic result. No text, logos, or watermarks.`,
    }, { career, background, size });
    return NextResponse.json(queued, { status: 202 });
  } catch (error) {
    console.error("fal.ai portrait generation failed", error);
    await failGeneration(context, error instanceof Error ? error.message : "generation_failed");
    return NextResponse.json({ error: "สร้างภาพโปรไฟล์ไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง" }, { status: 502 });
  }
}
