import { NextRequest, NextResponse } from "next/server";
import { createGenerationContext, enqueueGeneration, failGeneration } from "@/lib/imageGeneration";

export const maxDuration = 300;

async function toFalImageInput(imageUrl: string, isFile: boolean) {
  if (!isFile) return imageUrl;

  const response = await fetch(imageUrl);
  if (!response.ok) throw new Error("Unable to read uploaded image");

  return response.blob();
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 6_000_000) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 4 MB" }, { status: 413 });
  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const { imageUrl, scale = 2, enhancement = "dehaze" } = input ?? {};
  if (typeof imageUrl !== "string" || ![2, 4].includes(scale)) {
    return NextResponse.json({ error: "กรุณาระบุภาพและเลือกขยาย 2× หรือ 4×" }, { status: 400 });
  }
  const isFile = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageUrl);
  let isUrl = false;
  try {
    const url = new URL(imageUrl);
    isUrl = url.protocol === "https:" && !url.username && !url.password;
  } catch {
    /* validated below */
  }
  if (!isFile && !isUrl) return NextResponse.json({ error: "กรุณาใช้ภาพ JPG, PNG, WebP หรือลิงก์ HTTPS" }, { status: 400 });
  const context = await createGenerationContext(req, "upscale", scale);
  if (context instanceof NextResponse) return context;

  try {
    const image = await toFalImageInput(imageUrl, isFile);
    const isDehaze = enhancement === "dehaze" || enhancement === "fidelity";
    const endpoint = scale === 2 ? "fal-ai/clarity-upscaler" : "fal-ai/topaz/upscale/image";
    const queueInput = scale === 2
      ? { image_url: image, upscale_factor: 2 }
      : {
          image_url: image,
          upscale_factor: 4,
          model: "Standard V2",
          denoise: isDehaze ? 0.25 : 0.15,
          fix_compression: isDehaze ? 0.45 : 0.3,
          sharpen: isDehaze ? 0.65 : 0.5,
          face_enhancement: true,
          face_enhancement_strength: isDehaze ? 0.75 : 0.5,
          output_format: "jpeg",
        };
    const queued = await enqueueGeneration(context, endpoint, queueInput, {
      scale,
      enhancement: isDehaze ? "dehaze" : "vivid",
      model: scale === 4 ? (isDehaze ? "Topaz Standard V2 (Vivid Dehaze)" : "Topaz Standard V2 (Vivid Sharp)") : "Clarity Upscaler",
    });
    return NextResponse.json(queued, { status: 202 });
  } catch (error) {
    console.error("fal.ai upscale request failed", error);
    await failGeneration(context, error instanceof Error ? error.message : "generation_failed");
    return NextResponse.json({ error: "ขยายภาพไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง" }, { status: 502 });
  }
}
