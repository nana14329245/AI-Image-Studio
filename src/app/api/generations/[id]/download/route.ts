import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

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
  if (!generation?.output_path) return NextResponse.json({ error: "ไม่พบไฟล์ภาพที่ดาวน์โหลดได้" }, { status: 404 });

  const searchParams = req.nextUrl.searchParams;
  const indexStr = searchParams.get("index");
  let targetPath = generation.output_path;
  let fileSuffix = "";

  if (indexStr !== null) {
    const index = parseInt(indexStr, 10);
    const metadata = generation.generation_metadata as Record<string, unknown> | null;
    if (!Number.isNaN(index) && index >= 0 && Array.isArray(metadata?.output_paths) && metadata.output_paths[index]) {
      targetPath = metadata.output_paths[index] as string;
      fileSuffix = `-angle-${index + 1}`;
    }
  }

  const { data, error } = await createServiceRoleClient().storage.from("generations").download(targetPath);
  if (error || !data) return NextResponse.json({ error: "ดาวน์โหลดภาพไม่สำเร็จ กรุณาลองใหม่" }, { status: 502 });

  const extension = data.type === "image/jpeg" ? "jpg" : data.type === "image/webp" ? "webp" : "png";
  return new NextResponse(data, {
    headers: {
      "Content-Disposition": `attachment; filename="${generation.tool}-${id}${fileSuffix}.${extension}"`,
      "Content-Type": data.type,
    },
  });
}
