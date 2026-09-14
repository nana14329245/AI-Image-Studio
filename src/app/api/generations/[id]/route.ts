import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const { id } = await params;

  const { data: generation, error: findError } = await supabase
    .from("generations")
    .select("id, output_path, generation_metadata")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (findError || !generation) {
    return NextResponse.json({ error: "ไม่พบรูปภาพนี้ หรือคุณไม่มีสิทธิ์ลบ" }, { status: 404 });
  }

  // Gather all storage paths associated with this generation
  const storagePaths: string[] = [];
  if (generation.output_path) storagePaths.push(generation.output_path);

  const metadata = generation.generation_metadata as Record<string, unknown> | null;
  if (Array.isArray(metadata?.output_paths)) {
    for (const p of metadata.output_paths) {
      if (typeof p === "string" && !storagePaths.includes(p)) {
        storagePaths.push(p);
      }
    }
  }

  // Delete files from Supabase Storage
  if (storagePaths.length > 0) {
    try {
      await createServiceRoleClient().storage.from("generations").remove(storagePaths);
    } catch (err) {
      console.error("Failed to delete storage objects", err);
    }
  }

  // Delete database record
  const { error: deleteError } = await supabase
    .from("generations")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ error: "ลบรายการไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }

  return NextResponse.json({ success: true, deletedId: id });
}
