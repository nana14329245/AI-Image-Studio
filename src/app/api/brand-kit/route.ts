import { NextRequest, NextResponse } from "next/server";
import { isSupportedImageDataUrl } from "@/lib/imageGeneration";
import { getBrandKit, isValidHexColor, logoHasTransparency } from "@/lib/brandKit";
import { brandLogoPaths } from "@/lib/generationStorage";
import { generationsBucket, signStoragePaths } from "@/lib/signedUrls";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const { logoPath, primaryColor, secondaryColor } = await getBrandKit(supabase, user.id);
  const [logoUrl] = logoPath ? await signStoragePaths([logoPath]) : [null];
  return NextResponse.json({ logoUrl, primaryColor, secondaryColor });
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

  // Files to delete once the profile no longer points at them.
  let staleLogoPaths: string[] = [];

  if (input.removeLogo === true) {
    update.brand_logo_path = null;
    staleLogoPaths = brandLogoPaths(user.id);
  }

  if (typeof input.logo === "string") {
    if (!isSupportedImageDataUrl(input.logo)) {
      return NextResponse.json({ error: "รูปแบบไฟล์โลโก้ไม่ถูกต้อง กรุณาใช้ไฟล์ PNG หรือ WebP ที่พื้นหลังโปร่งใส" }, { status: 400 });
    }

    let image: Blob;
    try {
      const response = await fetch(input.logo);
      image = await response.blob();
    } catch (error) {
      console.error("Brand kit logo read failed", error);
      return NextResponse.json({ error: "อ่านไฟล์โลโก้ไม่สำเร็จ กรุณาลองใหม่" }, { status: 400 });
    }

    let transparent: boolean;
    try {
      transparent = await logoHasTransparency(image);
    } catch (error) {
      console.error("Brand kit logo inspection failed", error);
      return NextResponse.json({ error: "อ่านไฟล์โลโก้ไม่สำเร็จ กรุณาใช้ไฟล์ PNG อีกครั้ง" }, { status: 400 });
    }
    if (!transparent) {
      return NextResponse.json(
        {
          error:
            "โลโก้นี้ไม่มีพื้นหลังโปร่งใส ระบบจะประทับเป็นกรอบสี่เหลี่ยมทึบทับภาพสินค้า กรุณาใช้ไฟล์ PNG ที่ลบพื้นหลังออกแล้ว",
        },
        { status: 400 }
      );
    }

    try {
      const extension = image.type === "image/webp" ? "webp" : "png";
      const path = `${user.id}/brand-kit/logo.${extension}`;

      const { error: uploadError } = await generationsBucket().upload(path, image, { contentType: image.type, upsert: true });
      if (uploadError) throw uploadError;

      update.brand_logo_path = path;
      // A PNG replacing a WebP logo, or the reverse, leaves the old file behind.
      staleLogoPaths = brandLogoPaths(user.id).filter((candidate) => candidate !== path);
    } catch (error) {
      console.error("Brand kit logo upload failed", error);
      return NextResponse.json({ error: "อัปโหลดโลโก้ไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  // Written with the service role: users no longer have update rights on
  // brand_logo_path, so they cannot point it at a file this route did not write.
  const { error: updateError } = await createServiceRoleClient().from("profiles").update(update).eq("id", user.id);
  if (updateError) {
    console.error("Brand kit profile update failed", updateError);
    return NextResponse.json({ error: "บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }

  if (staleLogoPaths.length > 0) {
    // After the profile update, so a failure here only leaves an unused file behind.
    const { error: removeError } = await generationsBucket().remove(staleLogoPaths);
    if (removeError) console.error("Brand kit old logo removal failed", removeError);
  }

  return NextResponse.json({ ok: true });
}
