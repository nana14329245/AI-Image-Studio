/** Credits charged per successful generation, by tool. */
export const TOOL_CREDIT_COST: Record<string, number> = {
  upscale: 4,
  product: 6,
  ads: 8,
  portrait: 6,
};

export type PlanId = "free" | "pro" | "business";

export interface PlanDef {
  id: PlanId;
  name: string;
  monthlyPriceLabel: string;
  monthlyCredits: number;
  /** Stripe Price ID (recurring), read from env so it can differ per environment. */
  stripePriceEnvVar?: "STRIPE_PRICE_PRO" | "STRIPE_PRICE_BUSINESS";
  features: string[];
}

export const PLANS: PlanDef[] = [
  {
    id: "free",
    name: "Free",
    monthlyPriceLabel: "฿0",
    monthlyCredits: 20,
    features: ["20 เครดิตต่อเดือน", "เครื่องมือทั้งหมด", "Rate limit มาตรฐาน"],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPriceLabel: "฿299/เดือน",
    monthlyCredits: 500,
    stripePriceEnvVar: "STRIPE_PRICE_PRO",
    features: ["500 เครดิตต่อเดือน", "คิวประมวลผลเร็วขึ้น", "Rate limit สูงขึ้น"],
  },
  {
    id: "business",
    name: "Business",
    monthlyPriceLabel: "฿999/เดือน",
    monthlyCredits: 2000,
    stripePriceEnvVar: "STRIPE_PRICE_BUSINESS",
    features: ["2,000 เครดิตต่อเดือน", "Rate limit สูงสุด", "รองรับทีม (เร็วๆ นี้)"],
  },
];

export function planById(id: string | null | undefined): PlanDef {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

/** Resolves a Stripe Price ID (read from env at call time) back to its plan. */
export function planByStripePriceId(priceId: string | null | undefined): PlanDef | null {
  if (!priceId) return null;
  return (
    PLANS.find((p) => p.stripePriceEnvVar && process.env[p.stripePriceEnvVar] === priceId) ?? null
  );
}

export function stripePriceIdForPlan(plan: PlanDef): string | null {
  return plan.stripePriceEnvVar ? process.env[plan.stripePriceEnvVar] ?? null : null;
}
