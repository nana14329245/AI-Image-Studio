import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

  const rate = await checkRateLimit({ userId: user.id, ip: getClientIp(req), action: "billing" });
  if (!rate.allowed) {
    return NextResponse.json({ error: "ใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" }, { status: 429 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return NextResponse.json({ error: "ยังไม่พบข้อมูลการเรียกเก็บเงิน กรุณาสมัครแพ็กเกจก่อน" }, { status: 400 });
  }

  const stripe = getStripe();
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${origin}/account`,
  });

  return NextResponse.json({ url: session.url });
}
