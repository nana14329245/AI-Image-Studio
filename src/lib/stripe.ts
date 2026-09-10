import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

/** Server-only Stripe client. Never import this from a "use client" file. */
export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-08-26.dahlia",
    });
  }
  return stripeSingleton;
}
