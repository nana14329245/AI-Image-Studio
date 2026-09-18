import { NextRequest, NextResponse } from "next/server";
import { MAX_IMAGE_REQUEST_BODY_CHARS } from "@/lib/uploadLimits";
import { brandColorPromptHint, getBrandKit } from "@/lib/brandKit";
import {
  createGenerationContext,
  enqueueMultipleGenerations,
  failGeneration,
  isSupportedImageDataUrl,
  toFalImageInput,
} from "@/lib/imageGeneration";
import { PRODUCT_BACKGROUNDS, PRODUCT_STYLES, isAllowedOption, productSceneVariant } from "@/lib/toolOptions";

export const maxDuration = 300;

const MAX_REFERENCE_IMAGES = 3;

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > MAX_IMAGE_REQUEST_BODY_CHARS) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาเลือกภาพใหม่อีกครั้ง ระบบจะย่อให้อัตโนมัติ" }, { status: 413 });

  let input: { imageUrls?: unknown; style?: unknown; background?: unknown };
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const { imageUrls, style, background } = input;
  if (
    !Array.isArray(imageUrls) ||
    imageUrls.length < 1 ||
    imageUrls.length > MAX_REFERENCE_IMAGES ||
    !imageUrls.every(isSupportedImageDataUrl) ||
    !isAllowedOption(PRODUCT_STYLES, style) ||
    !isAllowedOption(PRODUCT_BACKGROUNDS, background)
  ) {
    return NextResponse.json({ error: `กรุณาเลือกรูปสินค้า 1-${MAX_REFERENCE_IMAGES} รูป พร้อมสไตล์และพื้นหลังที่รองรับ` }, { status: 400 });
  }

  const context = await createGenerationContext(req, "product");
  if (context instanceof NextResponse) return context;

  try {
    const falImages = await Promise.all(imageUrls.map(toFalImageInput));
    const kit = await getBrandKit(context.supabase, context.userId);
    const brandHint = brandColorPromptHint(kit);
    const brandSuffix = brandHint ? ` ${brandHint}` : "";

    // Each angle gets its own concrete scene (see productSceneVariant) instead
    // of repeating the same background phrase 4 times, and cycles through
    // whichever real reference photos were uploaded — a real side or back
    // angle grounds that generation far better than asking the model to
    // invent a view it never saw.
    const angleDescriptions = [
      "from a straight-on eye-level front view",
      "from a dynamic 45-degree three-quarter perspective angle showing side depth and dimension",
      "from an overhead top-down flatlay angle, magazine editorial aesthetic",
      "placed naturally in an ambient lifestyle in-context scene, warm natural lighting, realistic environment and depth of field",
    ];

    const inputs = angleDescriptions.map((angle, i) => ({
      image_url: falImages[i % falImages.length],
      aspect_ratio: "1:1",
      num_images: 1,
      prompt: `A single commercial product photograph of the product ${angle}. High-end e-commerce product photography set in ${productSceneVariant(background, i)}, ${style} lighting. Crisp focus, realistic reflections. Preserve exact product shape, colors, labels, and branding. Single full-frame image only, no collage, no split screen, no grid, no borders, no text, no watermark.${brandSuffix}`,
    }));

    const queued = await enqueueMultipleGenerations(context, "fal-ai/flux-pro/kontext", inputs, {
      style,
      background,
      variations: 4,
      referenceImages: imageUrls.length,
    });
    return NextResponse.json(queued, { status: 202 });
  } catch (error) {
    console.error("fal.ai product generation failed", error);
    await failGeneration(context, error instanceof Error ? error.message : "generation_failed");
    const message = error instanceof Error && error.message ? error.message : "สร้างภาพสินค้าไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
