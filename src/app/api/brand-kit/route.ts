import { NextRequest, NextResponse } from "next/server";
import { isSupportedImageDataUrl } from "@/lib/imageGeneration";
import { getBrandKit, isValidHexColor } from "@/lib/brandKit";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const kit = await getBrandKit(supabase, user.id);
  return NextResponse.json(kit);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  if (body.length > 3_500_000) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป กรุณาใช้รูปโลโก้ขนาดไม่เกิน 2 MB" }, { status: 413 });
  }

  let input: { primaryColor?: unknown; secondaryColor?: unknown; logo?: unknown; removeLogo?: unknown };
  try {
    input = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const update: Record<string, string | null> = {};

  if ("primaryColor" in input) {
    const { primaryColor } = input;
    if (primaryColor === null || primaryColor === "") {
      update.brand_primary_color = null;
    } else if (isValidHexColor(primaryColor)) {
      update.brand_primary_color = primaryColor;
    } else {
      return NextResponse.json({ error: "รหัสสีหลักไม่ถูกต้อง กรุณาใช้รูปแบบ HEX เช่น #1A2B3C" }, { status: 400 });
    }
  }

  if ("secondaryColor" in input) {
    const { secondaryColor } = input;
    if (secondaryColor === null || secondaryColor === "") {
      update.brand_secondary_color = null;
    } else if (isValidHexColor(secondaryColor)) {
      update.brand_secondary_color = secondaryColor;
    } else {
      return NextResponse.json({ error: "รหัสสีรองไม่ถูกต้อง กรุณาใช้รูปแบบ HEX เช่น #1A2B3C" }, { status: 400 });
    }
  }

  if (input.removeLogo === true) {
    update.brand_logo_path = null;
  }

  if (typeof input.logo === "string") {
    if (!isSupportedImageDataUrl(input.logo)) {
      return NextResponse.json({ error: "รูปแบบไฟล์โลโก้ไม่ถูกต้อง กรุณาใช้ไฟล์ JPG, PNG หรือ WebP" }, { status: 400 });
    }

    try {
      const response = await fetch(input.logo);
      const image = await response.blob();
      const extension = image.type === "image/jpeg" ? "jpg" : image.type === "image/webp" ? "webp" : "png";
      const path = `${user.id}/brand-kit/logo.${extension}`;

      const { error: uploadError } = await createServiceRoleClient()
        .storage.from("generations")
        .upload(path, image, { contentType: image.type, upsert: true });
      if (uploadError) throw uploadError;

      update.brand_logo_path = path;
    } catch (error) {
      console.error("Brand kit logo upload failed", error);
      return NextResponse.json({ error: "อัปโหลดโลโก้ไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  const { error: updateError } = await supabase.from("profiles").update(update).eq("id", user.id);
  if (updateError) {
    console.error("Brand kit profile update failed", updateError);
    return NextResponse.json({ error: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
