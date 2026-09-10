import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spendCredits, InsufficientCreditsError } from "@/lib/credits";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { TOOL_CREDIT_COST } from "@/lib/plans";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const ip = getClientIp(req);
  const rate = await checkRateLimit({ userId: user.id, ip, action: "upscale" });
  if (!rate.allowed) {
    return NextResponse.json({ error: "ใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" }, { status: 429 });
  }

  const body = await req.text();
  if (body.length > 6_000_000) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 4 MB" }, { status: 413 });
  let input;
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }
  const { imageUrl, scale = 2 } = input ?? {};
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
  if (!process.env.REPLICATE_API_TOKEN) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Replicate API token บนเซิร์ฟเวอร์" }, { status: 503 });

  const cost = TOOL_CREDIT_COST.upscale;

  const { data: profile } = await supabase.from("profiles").select("credits").eq("id", user.id).single();
  if (!profile || profile.credits < cost) {
    return NextResponse.json({ error: `เครดิตไม่พอ ต้องใช้ ${cost} เครดิตสำหรับการขยายภาพนี้` }, { status: 402 });
  }

  const { data: generation, error: insertError } = await supabase
    .from("generations")
    .insert({ user_id: user.id, tool: "upscale", status: "processing", scale })
    .select("id")
    .single();
  if (insertError || !generation) {
    return NextResponse.json({ error: "บันทึกงานไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }

  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN, useFileOutput: false });
    const output = await replicate.run(
      "nightmareai/real-esrgan:350d32041630ffbe63c8352783a26d94126809164e54085352f8326e53999085",
      { input: { image: imageUrl, scale, face_enhance: false } }
    );
    const result = Array.isArray(output) ? output[0] : output;
    if (typeof result !== "string" || !result.startsWith("https://")) {
      await supabase.from("generations").update({ status: "failed", error: "no_output" }).eq("id", generation.id);
      return NextResponse.json({ error: "บริการไม่ส่งภาพผลลัพธ์กลับมา กรุณาลองใหม่" }, { status: 502 });
    }

    let remaining: number;
    try {
      remaining = await spendCredits(supabase, user.id, cost, "upscale", { generationId: generation.id, scale });
    } catch (e) {
      if (e instanceof InsufficientCreditsError) {
        await supabase.from("generations").update({ status: "failed", error: "insufficient_credits" }).eq("id", generation.id);
        return NextResponse.json({ error: "เครดิตไม่พอ กรุณาเติมเครดิตหรืออัปเกรดแพ็กเกจ" }, { status: 402 });
      }
      throw e;
    }

    await supabase
      .from("generations")
      .update({ status: "completed", output_url: result, credits_spent: cost })
      .eq("id", generation.id);

    return NextResponse.json({ result, creditsRemaining: remaining });
  } catch {
    await supabase.from("generations").update({ status: "failed", error: "processing_error" }).eq("id", generation.id);
    return NextResponse.json({ error: "ขยายภาพไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง" }, { status: 502 });
  }
}
