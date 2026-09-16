import { afterEach, describe, expect, it } from "vitest";
import { PLANS, TOOL_CREDIT_COST, creditCapForPlan, planById, planByStripePriceId, stripePriceIdForPlan } from "./plans";

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

  it("prices every tool the free plan advertises", () => {
    for (const tool of ["upscale", "product", "ads", "portrait"]) {
      expect(TOOL_CREDIT_COST[tool]).toBeGreaterThan(0);
    }
  });

  it("lets a free account afford at least one run of every tool", () => {
    const free = planById("free");
    for (const cost of Object.values(TOOL_CREDIT_COST)) {
      expect(free.monthlyCredits).toBeGreaterThanOrEqual(cost);
    }
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
