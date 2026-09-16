import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { grantSubscriptionCredits } from "@/lib/credits";
import { creditCapForPlan, planByStripePriceId } from "@/lib/plans";
import { effectivePlan, grantsPaidPlan, toSubscriptionStatus, upgradeCredits } from "@/lib/subscriptions";

export const runtime = "nodejs";

type Supabase = ReturnType<typeof createServiceRoleClient>;

function customerIdOf(value: string | { id: string } | null): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

function priceIdOf(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price?.id ?? null;
}

function subscriptionIdOfInvoice(invoice: Stripe.Invoice): string | null {
  const ref = invoice.parent?.subscription_details?.subscription;
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

async function findProfile(supabase: Supabase, subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  const query = supabase.from("profiles").select("id, stripe_subscription_id");
  const { data, error } = userId
    ? await query.eq("id", userId).maybeSingle()
    : await query.eq("stripe_customer_id", customerIdOf(subscription.customer) ?? "").maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Writes Stripe's view of a subscription onto its profile and returns that
 * profile's id, or null when the event should not change anything.
 *
 * An event for a subscription other than the profile's current one is ignored
 * unless it grants a paid plan. Otherwise a late event for an old, ended
 * subscription could downgrade a customer who is paying for a newer one.
 */
async function syncSubscription(supabase: Supabase, subscription: Stripe.Subscription): Promise<string | null> {
  const profile = await findProfile(supabase, subscription);
  if (!profile) {
    console.warn("[stripe webhook] no profile for subscription", subscription.id);
    return null;
  }

  const status = toSubscriptionStatus(subscription.status);
  const isCurrent = !profile.stripe_subscription_id || profile.stripe_subscription_id === subscription.id;
  if (!isCurrent && !grantsPaidPlan(status)) return null;
  if (!isCurrent) {
    console.warn("[stripe webhook] profile moved to a different active subscription", profile.id, subscription.id);
  }

  const ended = status === "canceled" || status === "incomplete_expired";
  const periodEnd = subscription.items.data[0]?.current_period_end;
  const update = {
    stripe_customer_id: customerIdOf(subscription.customer),
    // Cleared once a subscription ends, so the customer's next one counts as current.
    stripe_subscription_id: ended ? null : subscription.id,
    subscription_status: status,
    plan: effectivePlan(status, planByStripePriceId(priceIdOf(subscription))),
    current_period_end: !ended && periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    cancel_at_period_end: !ended && (subscription.cancel_at_period_end || subscription.cancel_at !== null),
  };

  const { error } = await supabase.from("profiles").update(update).eq("id", profile.id);
  // Thrown so the route answers 500 and Stripe retries, rather than acknowledging
  // an update the database rejected.
  if (error) throw error;
  return profile.id;
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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode !== "subscription" || !session.subscription) break;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        await syncSubscription(supabase, await stripe.subscriptions.retrieve(subscriptionId));
        // Credits are granted on invoice.paid, once the money has actually been collected.
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const profileId = await syncSubscription(supabase, subscription);
        if (!profileId) break;

        // A plan change mid-cycle: grant the gap in monthly allowance once. The app
        // changes plans with payment_behavior "pending_if_incomplete", so the new
        // price only appears here after the prorated charge has succeeded.
        const previousPriceId = (event.data.previous_attributes as Partial<Stripe.Subscription> | undefined)
          ?.items?.data?.[0]?.price?.id;
        if (!previousPriceId || subscription.pending_update) break;
        const newPlan = planByStripePriceId(priceIdOf(subscription));
        const owed = upgradeCredits(planByStripePriceId(previousPriceId), newPlan);
        if (newPlan && owed > 0 && grantsPaidPlan(toSubscriptionStatus(subscription.status))) {
          await grantSubscriptionCredits(supabase, profileId, owed, creditCapForPlan(newPlan), {
            subscriptionId: subscription.id,
            event: "plan_upgrade",
            stripeEventId: event.id,
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        await syncSubscription(supabase, event.data.object);
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object;
        // The first payment and each renewal grant a month of credits. Plan changes
        // are handled on customer.subscription.updated.
        if (invoice.billing_reason !== "subscription_create" && invoice.billing_reason !== "subscription_cycle") break;
        const subscriptionId = subscriptionIdOfInvoice(invoice);
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const profileId = await syncSubscription(supabase, subscription);
        const plan = planByStripePriceId(priceIdOf(subscription));
        if (profileId && plan) {
          await grantSubscriptionCredits(supabase, profileId, plan.monthlyCredits, creditCapForPlan(plan), {
            subscriptionId: subscription.id,
            invoiceId: invoice.id,
            event: "invoice.paid",
            // Keyed on the invoice rather than the event, so one paid invoice grants
            // once however many events Stripe sends about it.
            stripeEventId: `invoice:${invoice.id}`,
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const subscriptionId = subscriptionIdOfInvoice(event.data.object);
        if (subscriptionId) await syncSubscription(supabase, await stripe.subscriptions.retrieve(subscriptionId));
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("[stripe webhook] failed to process", event.type, event.id, error);
    return NextResponse.json({ error: "processing failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
