import { NextRequest, NextResponse } from "next/server";
import { ownedGenerationPaths } from "@/lib/generationStorage";
import { generationsBucket } from "@/lib/signedUrls";
import { createClient } from "@/lib/supabase/server";

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

  const storagePaths = ownedGenerationPaths(user.id, id, generation.output_path, generation.generation_metadata);

  if (storagePaths.length > 0) {
    // Supabase reports storage failures in the result rather than by throwing, so
    // the row is kept when removal fails: deleting it would orphan the files.
    const { error: removeError } = await generationsBucket().remove(storagePaths);
    if (removeError) {
      console.error("Failed to delete storage objects", id, removeError);
      return NextResponse.json({ error: "ลบไฟล์ภาพไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
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
