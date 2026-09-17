import { NextRequest, NextResponse } from "next/server";
import { MAX_IMAGE_REQUEST_BODY_CHARS } from "@/lib/uploadLimits";
import { createGenerationContext, enqueueGeneration, failGeneration } from "@/lib/imageGeneration";
import { prepareUpscaleSource, type PreparedUpscaleSource } from "@/lib/upscaleSource";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > MAX_IMAGE_REQUEST_BODY_CHARS) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาเลือกภาพใหม่อีกครั้ง ระบบจะย่อให้อัตโนมัติ" }, { status: 413 });
  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const { imageUrl, scale = 2, enhancement = "dehaze" } = input ?? {};
  if (typeof imageUrl !== "string" || (scale !== 2 && scale !== 4)) {
    return NextResponse.json({ error: "กรุณาระบุภาพและเลือกขยาย 2× หรือ 4×" }, { status: 400 });
  }
  const isFile = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageUrl);
  if (!isFile && !imageUrl.startsWith("https://")) {
    return NextResponse.json({ error: "กรุณาใช้ภาพ JPG, PNG, WebP หรือลิงก์ HTTPS" }, { status: 400 });
  }

  // The price depends on the image's size, so the source is loaded and shrunk
  // before charging — but only after sign-in and rate limiting have passed.
  let prepared: PreparedUpscaleSource | undefined;
  const context = await createGenerationContext(req, "upscale", {
    scale,
    resolveCost: async () => {
      prepared = await prepareUpscaleSource(imageUrl, scale);
      return prepared.plan.credits;
    },
  });
  if (context instanceof NextResponse) return context;
  if (!prepared) throw new Error("upscale source was not prepared");

  try {
    const isDehaze = enhancement === "dehaze" || enhancement === "fidelity";
    const { plan } = prepared;
    // Topaz for both factors: it bills $0.01 per output megapixel against Clarity's
    // $0.03, and it keeps product details faithful rather than repainting them.
    const queued = await enqueueGeneration(
      context,
      "fal-ai/topaz/upscale/image",
      {
        image_url: prepared.image,
        upscale_factor: scale,
        model: "Standard V2",
        denoise: isDehaze ? 0.25 : 0.15,
        fix_compression: isDehaze ? 0.45 : 0.3,
        sharpen: isDehaze ? 0.75 : 0.6,
        // A face in the source keeps its own identity: Topaz's face pass is a
        // repaint, not just detail recovery, and at the old 0.5–0.75 strength
        // with the default (uncapped) creativity it drifted enough to read as
        // a different person. Low strength plus zero creativity still cleans
        // up JPEG artifacts on skin without redrawing features.
        face_enhancement: true,
        face_enhancement_strength: 0.25,
        face_enhancement_creativity: 0,
        output_format: "jpeg",
      },
      {
        scale,
        enhancement: isDehaze ? "dehaze" : "vivid",
        model: isDehaze ? "Topaz Standard V2 (Vivid Dehaze)" : "Topaz Standard V2 (Vivid Sharp)",
        input_size: `${plan.inputWidth}x${plan.inputHeight}`,
        output_size: `${plan.outputWidth}x${plan.outputHeight}`,
        downscaled: plan.downscaled,
        credits: plan.credits,
      }
    );
    return NextResponse.json({ ...queued, credits: plan.credits }, { status: 202 });
  } catch (error) {
    console.error("fal.ai upscale request failed", error);
    await failGeneration(context, error instanceof Error ? error.message : "generation_failed");
    return NextResponse.json({ error: "ขยายภาพไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง" }, { status: 502 });
  }
}
