import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { planById, stripePriceIdForPlan } from "@/lib/plans";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { blocksNewCheckout } from "@/lib/subscriptions";

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

  const { plan: planId } = await req.json().catch(() => ({}));
  const plan = planById(planId);
  const priceId = stripePriceIdForPlan(plan);
  if (plan.id === "free" || !priceId) {
    return NextResponse.json({ error: "แพ็กเกจนี้ไม่รองรับการชำระเงิน" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", user.id)
    .single();

  const stripe = getStripe();
  const origin = req.headers.get("origin") ?? new URL(req.url).origin;

  let customerId = profile?.stripe_customer_id ?? undefined;

  // Asked of Stripe rather than read from the profile: the profile only learns about
  // a subscription when a webhook lands, and trusting it let a customer who was
  // already subscribed start a second subscription and be billed for both.
  if (customerId) {
    const existing = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 20 });
    if (existing.data.some((subscription) => blocksNewCheckout(subscription.status))) {
      return NextResponse.json(
        { error: "คุณมีแพ็กเกจที่ยังใช้งานอยู่ กรุณาเปลี่ยนแพ็กเกจจากหน้าบัญชีแทนการสมัครใหม่", code: "subscription_exists" },
        { status: 409 }
      );
    }
  }

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    // Service role: users hold no update grant on stripe_customer_id, so this write
    // used to fail silently and every abandoned checkout created another customer.
    const { error: saveError } = await createServiceRoleClient()
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
    if (saveError) {
      console.error("[checkout] could not save stripe customer", user.id, saveError);
      return NextResponse.json({ error: "เริ่มการชำระเงินไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { metadata: { userId: user.id, plan: plan.id } },
    metadata: { userId: user.id, plan: plan.id },
    success_url: `${origin}/account?checkout=success`,
    cancel_url: `${origin}/account?checkout=cancel`,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
