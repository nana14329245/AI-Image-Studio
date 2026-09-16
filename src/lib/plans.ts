/**
 * Credits charged per run for tools with a fixed fal.ai cost.
 *
 * Priced so fal.ai's cost stays near half of what a credit earns on the Business
 * plan — the lowest revenue per credit, about ฿0.476 after Stripe fees.
 * flux-pro/kontext bills $0.04 (≈฿1.44) per image: Product Studio makes four,
 * Ad Studio and Professional Photo one each. Upscale is priced by size — see
 * planUpscale.
 */
export const TOOL_CREDIT_COST = {
  product: 24,
  ads: 8,
  portrait: 6,
} as const;

export type FixedPriceTool = keyof typeof TOOL_CREDIT_COST;

/** Longest edge of any upscaled result. Marketplace listings need about 2000px. */
export const UPSCALE_MAX_OUTPUT_EDGE = 4096;

/**
 * fal.ai's Topaz upscaler bills $0.01 per megapixel of output (≈฿0.36). At 1.5
 * credits per megapixel a Business subscriber pays about ฿0.71 per megapixel,
 * so fal.ai's cost stays near half, the same margin as the fixed-price tools.
 */
export const UPSCALE_CREDITS_PER_MEGAPIXEL = 1.5;
export const UPSCALE_MIN_CREDITS = 2;

export type UpscalePlan = {
  inputWidth: number;
  inputHeight: number;
  outputWidth: number;
  outputHeight: number;
  credits: number;
  /** True when the source had to be shrunk to keep the result within UPSCALE_MAX_OUTPUT_EDGE. */
  downscaled: boolean;
};

/**
 * The size an upscale will run at and what it costs. Used by the page to show the
 * price before submitting and by the server to charge it, so the two cannot
 * disagree. Orientation does not matter: only the longest edge and the pixel
 * count are used.
 */
export function planUpscale(width: number, height: number, scale: 2 | 4): UpscalePlan {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new RangeError("image dimensions must be positive");
  }
  const maxInputEdge = Math.floor(UPSCALE_MAX_OUTPUT_EDGE / scale);
  const ratio = Math.min(1, maxInputEdge / Math.max(width, height));
  const inputWidth = Math.max(1, Math.floor(width * ratio));
  const inputHeight = Math.max(1, Math.floor(height * ratio));
  const outputWidth = inputWidth * scale;
  const outputHeight = inputHeight * scale;
  const megapixels = (outputWidth * outputHeight) / 1_000_000;
  return {
    inputWidth,
    inputHeight,
    outputWidth,
    outputHeight,
    credits: Math.max(UPSCALE_MIN_CREDITS, Math.ceil(megapixels * UPSCALE_CREDITS_PER_MEGAPIXEL)),
    downscaled: ratio < 1,
  };
}

/** The most an upscale can cost: a square image at the maximum output size. */
export const UPSCALE_MAX_CREDITS = planUpscale(UPSCALE_MAX_OUTPUT_EDGE, UPSCALE_MAX_OUTPUT_EDGE, 4).credits;

/** Sales copy stays in step with TOOL_CREDIT_COST instead of hardcoding a count. */
function approxProductImages(credits: number): string {
  return `สร้างภาพสินค้าได้ประมาณ ${Math.floor(credits / TOOL_CREDIT_COST.product)} ครั้ง`;
}

/**
 * Credits a new account starts with. Enough for one run of every tool, including
 * Product Studio. The database grants these in the handle_new_user trigger
 * (migration 0011), which cannot read this constant — change both together.
 */
export const SIGNUP_CREDITS = 24;

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
    monthlyCredits: SIGNUP_CREDITS,
    features: [`${SIGNUP_CREDITS} เครดิตเมื่อสมัคร`, "ใช้ได้ครบทุกเครื่องมือ", approxProductImages(SIGNUP_CREDITS)],
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPriceLabel: "฿299/เดือน",
    monthlyCredits: 500,
    stripePriceEnvVar: "STRIPE_PRICE_PRO",
    features: ["500 เครดิตต่อเดือน", approxProductImages(500), "คิวประมวลผลเร็วขึ้น"],
  },
  {
    id: "business",
    name: "Business",
    monthlyPriceLabel: "฿999/เดือน",
    monthlyCredits: 2000,
    stripePriceEnvVar: "STRIPE_PRICE_BUSINESS",
    features: ["2,000 เครดิตต่อเดือน", approxProductImages(2000), "สร้างภาพต่อเนื่องได้ถี่ที่สุด"],
  },
];

/**
 * Unused subscription credits carry over, up to this many months' worth. Without
 * a ceiling every unused credit stays a liability for good.
 */
export const CREDIT_ROLLOVER_MONTHS = 2;

export function creditCapForPlan(plan: PlanDef): number {
  return plan.monthlyCredits * CREDIT_ROLLOVER_MONTHS;
}

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
