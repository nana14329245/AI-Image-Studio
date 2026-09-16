import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { planById, planByStripePriceId, stripePriceIdForPlan } from "@/lib/plans";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { classifyPlanChange, grantsPaidPlan, toSubscriptionStatus } from "@/lib/subscriptions";

/**
 * Moves an existing subscription between Pro and Business.
 *
 * Plan switching is done here rather than in the Stripe billing portal so that
 * pricing and credits stay in one place.
 * - Upgrades charge the prorated difference immediately. With
 *   payment_behavior "pending_if_incomplete" the subscription keeps its old
 *   price until that charge succeeds, so a declined card cannot unlock the
 *   bigger plan. The webhook grants the extra credits once the change applies.
 * - Downgrades apply now; the unused part of the old price becomes a credit on
 *   the next invoice. Credits already granted are kept.
 */
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
  const target = planById(planId);
  const targetPrice = stripePriceIdForPlan(target);
  if (target.id === "free" || !targetPrice) {
    return NextResponse.json({ error: "เลือกแพ็กเกจที่ต้องการเปลี่ยนไม่ถูกต้อง" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id")
    .eq("id", user.id)
    .single();
  if (!profile?.stripe_subscription_id) {
    return NextResponse.json({ error: "ไม่พบแพ็กเกจที่ใช้งานอยู่ กรุณาสมัครแพ็กเกจก่อน" }, { status: 400 });
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  const item = subscription.items.data[0];
  if (!item || !grantsPaidPlan(toSubscriptionStatus(subscription.status))) {
    return NextResponse.json({ error: "แพ็กเกจปัจจุบันไม่อยู่ในสถานะที่เปลี่ยนได้" }, { status: 409 });
  }
  if (subscription.pending_update) {
    return NextResponse.json({ error: "มีการเปลี่ยนแพ็กเกจที่รอชำระเงินอยู่ กรุณาชำระให้เสร็จก่อน" }, { status: 409 });
  }

  const current = planByStripePriceId(item.price.id);
  if (!current) {
    console.error("[change-plan] subscription has an unknown price", subscription.id, item.price.id);
    return NextResponse.json({ error: "ไม่รู้จักแพ็กเกจปัจจุบัน กรุณาติดต่อผู้ดูแล" }, { status: 409 });
  }
  const change = classifyPlanChange(current.id, target.id);
  if (change === "same") {
    return NextResponse.json({ error: "คุณใช้แพ็กเกจนี้อยู่แล้ว" }, { status: 400 });
  }

  try {
    const updated = await stripe.subscriptions.update(subscription.id, {
      items: [{ id: item.id, price: targetPrice }],
      proration_behavior: change === "upgrade" ? "always_invoice" : "create_prorations",
      // pending_if_incomplete only accepts a small set of fields alongside it, so
      // nothing else (such as cancel_at_period_end) is changed in the same call.
      payment_behavior: change === "upgrade" ? "pending_if_incomplete" : "allow_incomplete",
    });
    return NextResponse.json({ change, pending: Boolean(updated.pending_update) });
  } catch (error) {
    console.error("[change-plan] stripe update failed", user.id, error);
    return NextResponse.json(
      { error: change === "upgrade" ? "ชำระส่วนต่างไม่สำเร็จ แพ็กเกจยังเป็นแบบเดิม กรุณาตรวจสอบบัตรแล้วลองใหม่" : "เปลี่ยนแพ็กเกจไม่สำเร็จ กรุณาลองใหม่" },
      { status: 402 }
    );
  }
}
