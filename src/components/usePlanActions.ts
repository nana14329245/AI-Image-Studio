"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { planById, type PlanId } from "@/lib/plans";

type PaidPlanId = Exclude<PlanId, "free">;
type Busy = PaidPlanId | "portal" | null;

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
  return data;
}

/**
 * Subscribe, switch plan, and open the Stripe billing portal — shared by the
 * account and promotions pages so both follow the same rules: a customer who
 * already has a subscription switches plan instead of starting a second one.
 */
export function usePlanActions() {
  const router = useRouter();
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function run(next: Busy, action: () => Promise<void>) {
    setBusy(next);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ทำรายการไม่สำเร็จ กรุณาลองใหม่");
      setBusy(null);
    }
  }

  function subscribe(planId: PaidPlanId) {
    return run(planId, async () => {
      track("checkout_started", { plan: planId });
      const data = await postJson("/api/billing/checkout", { plan: planId });
      if (typeof data.url !== "string") throw new Error("เริ่มการชำระเงินไม่สำเร็จ");
      window.location.assign(data.url);
    });
  }

  function changePlan(planId: PaidPlanId, currentPlan: PlanId) {
    const target = planById(planId);
    const upgrading = target.monthlyCredits > planById(currentPlan).monthlyCredits;
    const message = upgrading
      ? `เปลี่ยนเป็นแพ็ก ${target.name} ตอนนี้?\n\nระบบจะตัดเงินส่วนต่างตามวันที่เหลือของรอบบิลนี้ทันที และเพิ่มเครดิตส่วนต่างให้เมื่อชำระสำเร็จ`
      : `เปลี่ยนเป็นแพ็ก ${target.name} ตอนนี้?\n\nค่าแพ็กเดิมส่วนที่ยังไม่ได้ใช้จะไปหักจากบิลรอบหน้า เครดิตที่มีอยู่ไม่ถูกหักออก`;
    if (!window.confirm(message)) return Promise.resolve();

    return run(planId, async () => {
      const data = await postJson("/api/billing/change-plan", { plan: planId });
      setNotice(
        data.pending
          ? "กำลังรอการชำระเงินส่วนต่าง แพ็กเกจจะเปลี่ยนเมื่อชำระสำเร็จ"
          : upgrading
            ? `เปลี่ยนเป็น ${target.name} แล้ว เครดิตส่วนต่างจะเข้าบัญชีภายในไม่กี่วินาที`
            : `เปลี่ยนเป็น ${target.name} แล้ว`
      );
      setBusy(null);
      router.refresh();
    });
  }

  function openPortal() {
    return run("portal", async () => {
      const data = await postJson("/api/billing/portal");
      if (typeof data.url !== "string") throw new Error("เปิดหน้าจัดการการสมัครสมาชิกไม่สำเร็จ");
      window.location.assign(data.url);
    });
  }

  return { busy, error, notice, subscribe, changePlan, openPortal };
}
