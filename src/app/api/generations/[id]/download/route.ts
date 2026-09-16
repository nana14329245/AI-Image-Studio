import { NextRequest, NextResponse } from "next/server";
import { ownedGenerationPaths } from "@/lib/generationStorage";
import { generationsBucket } from "@/lib/signedUrls";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const { id } = await params;
  const { data: generation } = await supabase
    .from("generations")
    .select("output_path, tool, generation_metadata")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "completed")
    .single();
  // Read with the service role, so only paths in this generation's own folder are accepted.
  const paths = generation ? ownedGenerationPaths(user.id, id, generation.output_path, generation.generation_metadata) : [];
  if (!generation || paths.length === 0) return NextResponse.json({ error: "ไม่พบไฟล์ภาพที่ดาวน์โหลดได้" }, { status: 404 });

  const indexStr = req.nextUrl.searchParams.get("index");
  let targetPath = paths[0];
  let fileSuffix = "";

  if (indexStr !== null) {
    const index = parseInt(indexStr, 10);
    if (!Number.isNaN(index) && index >= 0 && paths[index]) {
      targetPath = paths[index];
      fileSuffix = `-angle-${index + 1}`;
    }
  }

  const { data, error } = await generationsBucket().download(targetPath);
  if (error || !data) return NextResponse.json({ error: "ดาวน์โหลดภาพไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });

  const extension = data.type === "image/jpeg" ? "jpg" : data.type === "image/webp" ? "webp" : "png";
  return new NextResponse(data, {
    headers: {
      "Content-Disposition": `attachment; filename="${generation.tool}-${id}${fileSuffix}.${extension}"`,
      "Content-Type": data.type,
    },
  });
}
