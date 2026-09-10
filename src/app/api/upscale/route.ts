import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300;
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    if (body.length > 6_000_000) return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาใช้ภาพขนาดไม่เกิน 4 MB" }, { status: 413 });
    let input;
    try { input = JSON.parse(body); } catch { return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
    const { imageUrl, scale = 2 } = input ?? {};
    if (typeof imageUrl !== "string" || ![2, 4].includes(scale)) return NextResponse.json({ error: "กรุณาระบุภาพและเลือกขยาย 2× หรือ 4×" }, { status: 400 });
    const isFile = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(imageUrl);
    let isUrl = false;
    try { const url = new URL(imageUrl); isUrl = url.protocol === "https:" && !url.username && !url.password; } catch { /* validated below */ }
    if (!isFile && !isUrl) return NextResponse.json({ error: "กรุณาใช้ภาพ JPG, PNG, WebP หรือลิงก์ HTTPS" }, { status: 400 });
    if (!process.env.REPLICATE_API_TOKEN) return NextResponse.json({ error: "ยังไม่ได้ตั้งค่า Replicate API token บนเซิร์ฟเวอร์" }, { status: 503 });
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN, useFileOutput: false });
    const output = await replicate.run(
      "nightmareai/real-esrgan:350d32041630ffbe63c8352783a26d94126809164e54085352f8326e53999085",
      { input: { image: imageUrl, scale, face_enhance: false } }
    );
    const result = Array.isArray(output) ? output[0] : output;
    if (typeof result !== "string" || !result.startsWith("https://")) return NextResponse.json({ error: "บริการไม่ส่งภาพผลลัพธ์กลับมา กรุณาลองใหม่" }, { status: 502 });
    return NextResponse.json({ result });
  } catch {
    return NextResponse.json({ error: "ขยายภาพไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าบริการแล้วลองอีกครั้ง" }, { status: 502 });
  }
}
