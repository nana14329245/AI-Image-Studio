import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { grantCredits } from "@/lib/credits";
import { PLANS, planByStripePriceId } from "@/lib/plans";

export const runtime = "nodejs";

async function upsertFromSubscription(
  supabase: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription,
  userId: string | null
) {
  const priceId = subscription.items.data[0]?.price?.id ?? null;
  const plan = planByStripePriceId(priceId) ?? PLANS[0];
  const periodEndUnix = subscription.items.data[0]?.current_period_end;

  const update: Record<string, unknown> = {
    stripe_subscription_id: subscription.id,
    subscription_status: subscription.status,
    plan: plan.id,
    current_period_end: periodEndUnix ? new Date(periodEndUnix * 1000).toISOString() : null,
  };

  let query = supabase.from("profiles").update(update);
  query = userId ? query.eq("id", userId) : query.eq("stripe_customer_id", subscription.customer as string);
  await query;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "missing signature or webhook secret" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `invalid signature: ${(err as Error).message}` }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription" || !session.subscription) break;
      const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
      const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
      await upsertFromSubscription(supabase, subscription, userId);

      const priceId = subscription.items.data[0]?.price?.id ?? null;
      const plan = planByStripePriceId(priceId);
      if (userId && plan) {
        await grantCredits(supabase, userId, plan.monthlyCredits, "subscription_grant", {
          subscriptionId: subscription.id,
          event: "checkout.session.completed",
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = (subscription.metadata?.userId as string) ?? null;
      await upsertFromSubscription(supabase, subscription, userId);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = (subscription.metadata?.userId as string) ?? null;
      const update = {
        plan: "free",
        subscription_status: "canceled",
        stripe_subscription_id: null,
        current_period_end: null,
      };
      let query = supabase.from("profiles").update(update);
      query = userId ? query.eq("id", userId) : query.eq("stripe_customer_id", subscription.customer as string);
      await query;
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      // only grant credits on recurring renewals, not on the very first invoice
      // (the first cycle's credits are granted by checkout.session.completed above)
      if (invoice.billing_reason !== "subscription_cycle") break;
      const subscriptionId =
        typeof invoice.parent?.subscription_details?.subscription === "string"
          ? invoice.parent.subscription_details.subscription
          : null;
      if (!subscriptionId) break;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const userId = (subscription.metadata?.userId as string) ?? null;
      const priceId = subscription.items.data[0]?.price?.id ?? null;
      const plan = planByStripePriceId(priceId);
      if (userId && plan) {
        await grantCredits(supabase, userId, plan.monthlyCredits, "subscription_grant", {
          subscriptionId: subscription.id,
          event: "invoice.paid",
        });
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
