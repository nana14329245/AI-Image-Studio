import { describe, expect, it } from "vitest";
import { planById } from "./plans";
import {
  SUBSCRIPTION_STATUSES,
  blocksNewCheckout,
  classifyPlanChange,
  effectivePlan,
  grantsPaidPlan,
  subscriptionStatusLabel,
  toSubscriptionStatus,
  upgradeCredits,
} from "./subscriptions";

describe("toSubscriptionStatus", () => {
  it("keeps every status Stripe sends, including the ones the old constraint rejected", () => {
    for (const status of ["unpaid", "incomplete_expired", "paused"]) {
      expect(toSubscriptionStatus(status)).toBe(status);
    }
  });

  it("falls back to none for anything unknown", () => {
    expect(toSubscriptionStatus("something_new")).toBe("none");
    expect(toSubscriptionStatus(undefined)).toBe("none");
    expect(toSubscriptionStatus(null)).toBe("none");
  });
});

describe("grantsPaidPlan and effectivePlan", () => {
  const pro = planById("pro");

  it("keeps the paid plan while Stripe is still retrying a failed card", () => {
    expect(grantsPaidPlan("past_due")).toBe(true);
    expect(effectivePlan("past_due", pro)).toBe("pro");
  });

  it.each(["unpaid", "paused", "canceled", "incomplete", "incomplete_expired", "none"] as const)(
    "drops to free when the subscription is %s",
    (status) => {
      expect(effectivePlan(status, pro)).toBe("free");
    }
  );

  it("drops to free when the price is not one of ours, even if active", () => {
    expect(effectivePlan("active", null)).toBe("free");
  });
});

describe("blocksNewCheckout", () => {
  it.each(["active", "trialing", "past_due", "unpaid", "paused", "incomplete"])(
    "refuses a second subscription while one is %s",
    (status) => {
      // Every one of these can still bill, so allowing another checkout double-charges.
      expect(blocksNewCheckout(status)).toBe(true);
    }
  );

  it.each(["canceled", "incomplete_expired", "none"])("allows a new subscription once the old one is %s", (status) => {
    expect(blocksNewCheckout(status)).toBe(false);
  });

  it("treats a status Stripe adds in future as still able to bill", () => {
    expect(blocksNewCheckout("some_future_status")).toBe(true);
  });
});

describe("upgradeCredits", () => {
  it("grants the gap in monthly allowance when moving up", () => {
    expect(upgradeCredits(planById("pro"), planById("business"))).toBe(1500);
  });

  it("grants nothing when moving down or staying put", () => {
    expect(upgradeCredits(planById("business"), planById("pro"))).toBe(0);
    expect(upgradeCredits(planById("pro"), planById("pro"))).toBe(0);
  });

  it("grants nothing when either side is not a known plan", () => {
    expect(upgradeCredits(null, planById("business"))).toBe(0);
    expect(upgradeCredits(planById("pro"), null)).toBe(0);
  });
});

describe("classifyPlanChange", () => {
  it("orders plans by their monthly allowance", () => {
    expect(classifyPlanChange("pro", "business")).toBe("upgrade");
    expect(classifyPlanChange("business", "pro")).toBe("downgrade");
    expect(classifyPlanChange("pro", "pro")).toBe("same");
  });
});

describe("subscriptionStatusLabel", () => {
  it("has a Thai label for every status", () => {
    for (const status of SUBSCRIPTION_STATUSES) {
      expect(subscriptionStatusLabel(status).trim()).not.toBe("");
      expect(subscriptionStatusLabel(status)).not.toMatch(/^[a-z_]+$/);
    }
  });
});
