import { planById, type PlanDef, type PlanId } from "@/lib/plans";

/** Every status Stripe can report, plus "none" for an account that never subscribed. */
export const SUBSCRIPTION_STATUSES = [
  "none",
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
  "incomplete_expired",
  "unpaid",
  "paused",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export function toSubscriptionStatus(value: unknown): SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.includes(value as SubscriptionStatus) ? (value as SubscriptionStatus) : "none";
}

/**
 * Statuses that keep the paid plan's features.
 *
 * past_due is included on purpose: Stripe is still retrying the card, and cutting
 * the customer off during that window punishes an expired card rather than a
 * refusal to pay. unpaid, paused and anything that has ended fall back to free.
 */
export function grantsPaidPlan(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing" || status === "past_due";
}

/**
 * Statuses where a subscription still exists and could still bill.
 *
 * A new checkout must be refused for any of these, or the customer ends up
 * paying for two subscriptions at once. Only a subscription that has fully ended
 * — canceled, or incomplete_expired because its first payment never succeeded —
 * frees the customer to start another.
 */
export function blocksNewCheckout(status: SubscriptionStatus | string): boolean {
  return status !== "canceled" && status !== "incomplete_expired" && status !== "none";
}

/** The plan a profile should be on, given what Stripe reports. */
export function effectivePlan(status: SubscriptionStatus, pricedPlan: PlanDef | null): PlanId {
  return grantsPaidPlan(status) && pricedPlan ? pricedPlan.id : "free";
}

/**
 * Credits owed when a subscription moves to a bigger plan mid-cycle: the gap in
 * monthly allowance, once. Moving down owes nothing, and credits already granted
 * are not taken back.
 */
export function upgradeCredits(from: PlanDef | null, to: PlanDef | null): number {
  if (!from || !to) return 0;
  return Math.max(0, to.monthlyCredits - from.monthlyCredits);
}

export type PlanChange = "upgrade" | "downgrade" | "same";

export function classifyPlanChange(from: PlanId, to: PlanId): PlanChange {
  const difference = planById(to).monthlyCredits - planById(from).monthlyCredits;
  return difference > 0 ? "upgrade" : difference < 0 ? "downgrade" : "same";
}

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  none: "ยังไม่ได้สมัครแพ็กเกจ",
  active: "ใช้งานอยู่",
  trialing: "ช่วงทดลองใช้",
  past_due: "ชำระเงินไม่สำเร็จ กำลังลองตัดเงินใหม่",
  canceled: "ยกเลิกแล้ว",
  incomplete: "รอการชำระเงินครั้งแรก",
  incomplete_expired: "การชำระเงินครั้งแรกหมดอายุ",
  unpaid: "ค้างชำระ",
  paused: "หยุดชั่วคราว",
};

export function subscriptionStatusLabel(status: SubscriptionStatus): string {
  return STATUS_LABEL[status];
}
