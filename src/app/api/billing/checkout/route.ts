import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { planById, stripePriceIdForPlan } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401 });

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
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? user.email ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", user.id);
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
