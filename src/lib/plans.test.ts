import { afterEach, describe, expect, it } from "vitest";
import {
  PLANS,
  SIGNUP_CREDITS,
  TOOL_CREDIT_COST,
  UPSCALE_CREDITS_PER_MEGAPIXEL,
  UPSCALE_MAX_CREDITS,
  UPSCALE_MAX_OUTPUT_EDGE,
  UPSCALE_MIN_CREDITS,
  creditCapForPlan,
  planById,
  planByStripePriceId,
  planUpscale,
  stripePriceIdForPlan,
} from "./plans";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("planById", () => {
  it("resolves each known plan id", () => {
    expect(planById("pro").name).toBe("Pro");
    expect(planById("business").name).toBe("Business");
  });

  it("falls back to the free plan for unknown, null or undefined ids", () => {
    // A bad value here must never hand out a paid plan's credits.
    expect(planById("enterprise").id).toBe("free");
    expect(planById(null).id).toBe("free");
    expect(planById(undefined).id).toBe("free");
  });
});

describe("planByStripePriceId", () => {
  it("maps a configured Stripe price back to its plan", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro_123";
    process.env.STRIPE_PRICE_BUSINESS = "price_business_456";

    expect(planByStripePriceId("price_pro_123")?.id).toBe("pro");
    expect(planByStripePriceId("price_business_456")?.id).toBe("business");
  });

  it("returns null rather than guessing when the price is unknown or missing", () => {
    process.env.STRIPE_PRICE_PRO = "price_pro_123";

    expect(planByStripePriceId("price_unrecognised")).toBeNull();
    expect(planByStripePriceId(null)).toBeNull();
    expect(planByStripePriceId(undefined)).toBeNull();
    expect(planByStripePriceId("")).toBeNull();
  });

  it("does not match a plan whose price env var is unset", () => {
    delete process.env.STRIPE_PRICE_PRO;
    delete process.env.STRIPE_PRICE_BUSINESS;

    // Without this guard an undefined env var would match an undefined price id.
    expect(planByStripePriceId(undefined)).toBeNull();
    expect(planByStripePriceId("price_pro_123")).toBeNull();
  });
});

describe("stripePriceIdForPlan", () => {
  it("returns null for the free plan, which has no Stripe price", () => {
    expect(stripePriceIdForPlan(planById("free"))).toBeNull();
  });

  it("reads the price id from the environment at call time", () => {
    process.env.STRIPE_PRICE_PRO = "price_live_abc";
    expect(stripePriceIdForPlan(planById("pro"))).toBe("price_live_abc");
  });
});

describe("plan and credit-cost data", () => {
  it("gives every paid plan more monthly credits than the one below it", () => {
    const credits = PLANS.map((plan) => plan.monthlyCredits);
    expect(credits).toEqual([...credits].sort((a, b) => a - b));
  });

  it("prices every fixed-price tool", () => {
    for (const cost of Object.values(TOOL_CREDIT_COST)) {
      expect(cost).toBeGreaterThan(0);
    }
  });

  it("lets a new account try every fixed-price tool once", () => {
    for (const cost of Object.values(TOOL_CREDIT_COST)) {
      expect(SIGNUP_CREDITS).toBeGreaterThanOrEqual(cost);
    }
  });

  it("lets a new account upscale an ordinary 4:3 phone photo at full size", () => {
    expect(planUpscale(4000, 3000, 4).credits).toBeLessThanOrEqual(SIGNUP_CREDITS);
  });

  it("keeps fal.ai's cost at or under about half of Business revenue per credit", () => {
    // ฿999 less Stripe's 3.65% + ฿10, over 2,000 credits.
    const businessThbPerCredit = (999 - (999 * 0.0365 + 10)) / 2000;
    const kontextThb = 0.04 * 36;
    const falCost = { product: 4 * kontextThb, ads: kontextThb, portrait: kontextThb };
    for (const tool of Object.keys(TOOL_CREDIT_COST) as (keyof typeof TOOL_CREDIT_COST)[]) {
      const revenue = TOOL_CREDIT_COST[tool] * businessThbPerCredit;
      expect(falCost[tool] / revenue, tool).toBeLessThanOrEqual(0.51);
    }
    // Topaz: $0.01 per output megapixel.
    for (const [w, h, scale] of [[4000, 3000, 4], [1024, 1024, 4], [800, 600, 2], [5000, 5000, 2]] as const) {
      const plan = planUpscale(w, h, scale);
      const megapixels = (plan.outputWidth * plan.outputHeight) / 1e6;
      expect((megapixels * 0.01 * 36) / (plan.credits * businessThbPerCredit), `${w}x${h} ${scale}x`).toBeLessThanOrEqual(0.51);
    }
  });
});

describe("planUpscale", () => {
  it("keeps a small image at its own size and charges by output megapixels", () => {
    const plan = planUpscale(800, 600, 4);
    expect(plan).toMatchObject({ inputWidth: 800, inputHeight: 600, outputWidth: 3200, outputHeight: 2400, downscaled: false });
    expect(plan.credits).toBe(Math.ceil(7.68 * UPSCALE_CREDITS_PER_MEGAPIXEL));
  });

  it("shrinks a large source so the long edge of the result stays within the limit", () => {
    const plan = planUpscale(4000, 3000, 4);
    expect(plan.downscaled).toBe(true);
    expect(Math.max(plan.outputWidth, plan.outputHeight)).toBeLessThanOrEqual(UPSCALE_MAX_OUTPUT_EDGE);
    expect(plan.outputWidth).toBe(4096);
    expect(plan.outputHeight).toBe(3072);
  });

  it("applies the same output limit to 2x, so 2x never produces a bigger bill than it should", () => {
    const plan = planUpscale(6000, 4000, 2);
    expect(Math.max(plan.outputWidth, plan.outputHeight)).toBeLessThanOrEqual(UPSCALE_MAX_OUTPUT_EDGE);
    expect(plan.credits).toBeLessThanOrEqual(UPSCALE_MAX_CREDITS);
  });

  it("handles portrait orientation the same as landscape", () => {
    const landscape = planUpscale(4000, 3000, 4);
    const portrait = planUpscale(3000, 4000, 4);
    expect(portrait.credits).toBe(landscape.credits);
    expect(portrait.outputHeight).toBe(4096);
  });

  it("never charges below the minimum, even for a tiny image", () => {
    expect(planUpscale(10, 10, 2).credits).toBe(UPSCALE_MIN_CREDITS);
  });

  it("caps the most expensive case at the advertised maximum", () => {
    // The 800 megapixel job the old route would have sent to fal.ai.
    expect(planUpscale(8000, 6000, 4).credits).toBeLessThanOrEqual(UPSCALE_MAX_CREDITS);
    expect(UPSCALE_MAX_CREDITS).toBe(26);
  });

  it("rejects dimensions that are not positive numbers", () => {
    expect(() => planUpscale(0, 100, 2)).toThrow(RangeError);
    expect(() => planUpscale(Number.NaN, 100, 4)).toThrow(RangeError);
  });
});

describe("creditCapForPlan", () => {
  it("allows two months of each paid plan's allowance to accumulate", () => {
    expect(creditCapForPlan(planById("pro"))).toBe(1000);
    expect(creditCapForPlan(planById("business"))).toBe(4000);
  });

  it("is never below one month's grant, so a renewal always fits", () => {
    for (const plan of PLANS) {
      expect(creditCapForPlan(plan)).toBeGreaterThanOrEqual(plan.monthlyCredits);
    }
  });
});

describe("plan copy", () => {
  it("derives the image count from the current product cost rather than a stale number", () => {
    const pro = planById("pro");
    const expected = Math.floor(pro.monthlyCredits / TOOL_CREDIT_COST.product);
    expect(pro.features.some((f) => f.includes(String(expected)))).toBe(true);
  });

  it("does not describe the one-off signup grant as monthly", () => {
    expect(planById("free").features.join(" ")).not.toContain("ต่อเดือน");
  });
});
