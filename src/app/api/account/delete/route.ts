import { NextRequest, NextResponse } from "next/server";
import { brandLogoPaths, ownedGenerationPaths } from "@/lib/generationStorage";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { generationsBucket } from "@/lib/signedUrls";
import { getStripe } from "@/lib/stripe";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

/**
 * PDPA account deletion: cancels any live Stripe subscription immediately,
 * removes every private storage object the user owns, then deletes the auth
 * user — which cascades (on delete cascade, see migration 0001) to the
 * profile row, credit ledger, generations and rate-limit events.
 *
 * Storage is removed before the auth user so a failure here leaves the
 * account intact rather than an orphaned bucket of images nobody can reach
 * or clean up afterwards.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });

  const rate = await checkRateLimit({ userId: user.id, ip: getClientIp(req), action: "account_delete" });
  if (!rate.allowed) {
    return NextResponse.json({ error: "ใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" }, { status: 429 });
  }

  let input: { confirmEmail?: unknown };
  try {
    input = await req.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  // Requiring the account's own email to be retyped guards against a stray
  // or scripted POST doing something no click in the UI would ever cause.
  const confirmEmail = typeof input.confirmEmail === "string" ? input.confirmEmail.trim().toLowerCase() : "";
  if (!user.email || confirmEmail !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "อีเมลยืนยันไม่ตรงกับบัญชีนี้" }, { status: 400 });
  }

  const service = createServiceRoleClient();

  const { data: profile } = await service
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(profile.stripe_subscription_id);
    } catch (error) {
      // Already canceled, already ended, or never existed — none of these
      // should block deleting the account itself.
      console.error("Account delete: Stripe subscription cancel failed", user.id, error);
    }
  }

  const { data: generations, error: generationsError } = await service
    .from("generations")
    .select("id, output_path, generation_metadata")
    .eq("user_id", user.id);

  if (generationsError) {
    console.error("Account delete: could not list generations", user.id, generationsError);
    return NextResponse.json({ error: "ลบบัญชีไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }

  const storagePaths = [
    ...(generations ?? []).flatMap((row) =>
      ownedGenerationPaths(user.id, row.id, row.output_path, row.generation_metadata)
    ),
    ...brandLogoPaths(user.id),
  ];

  if (storagePaths.length > 0) {
    // Reported in the result rather than thrown; bail out before touching the
    // auth user so a failed cleanup can simply be retried.
    const { error: removeError } = await generationsBucket().remove(storagePaths);
    if (removeError) {
      console.error("Account delete: storage cleanup failed", user.id, removeError);
      return NextResponse.json({ error: "ลบไฟล์ภาพไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
    }
  }

  const { error: deleteUserError } = await service.auth.admin.deleteUser(user.id);
  if (deleteUserError) {
    console.error("Account delete: auth user deletion failed", user.id, deleteUserError);
    return NextResponse.json({ error: "ลบบัญชีไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
