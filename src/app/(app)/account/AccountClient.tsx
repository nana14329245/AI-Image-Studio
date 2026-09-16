"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";
import { useRouter, useSearchParams } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import { PLANS, type PlanId } from "@/lib/plans";

type ProfileData = {
  id: string;
  email: string;
  display_name: string | null;
  credits: number;
  plan: PlanId;
  subscription_status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

type LedgerItem = {
  id: number;
  delta: number;
  balance_after: number;
  reason: string;
  tool: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

function formatDate(isoString: string | null | undefined) {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("th-TH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

function toolLabel(tool: string | null, reason: string) {
  if (tool === "upscale") return "4K Upscale";
  if (tool === "product") return "Product Studio";
  if (tool === "ads") return "Ad Studio";
  if (tool === "portrait") return "Professional Photo";
  if (reason === "signup_bonus") return "โบนัสสมัครสมาชิก";
  if (reason === "subscription_grant") return "เครดิตรายเดือน";
  if (reason === "stripe_topup") return "เติมเครดิต";
  if (reason === "admin_adjustment") return "ปรับปรุงโดยผู้ดูแล";
  return reason || "การใช้งาน";
}

export default function AccountClient({
  profile: initialProfile,
  ledger: initialLedger,
}: {
  profile: ProfileData;
  ledger: LedgerItem[];
}) {
  const [profile, setProfile] = useState<ProfileData>(initialProfile);
  const [displayName, setDisplayName] = useState(initialProfile.display_name || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSuccess, setNameSuccess] = useState(false);
  const [billingLoading, setBillingLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isSuccess = searchParams.get("checkout") === "success";
  const isCanceled = searchParams.get("checkout") === "cancel";

  async function handleSaveDisplayName() {
    setIsSavingName(true);
    setNameSuccess(false);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ display_name: displayName.trim() || null })
        .eq("id", profile.id);

      if (updateError) throw updateError;
      setProfile((prev) => ({ ...prev, display_name: displayName.trim() || null }));
      setNameSuccess(true);
      router.refresh();
      setTimeout(() => setNameSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "บันทึกชื่อไม่สำเร็จ");
    } finally {
      setIsSavingName(false);
    }
  }

  async function handleCheckout(planId: "pro" | "business") {
    track("checkout_started", { plan: planId });
    setBillingLoading(planId);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "ไม่สามารถเริ่มขั้นตอนชำระเงินได้");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเชื่อมต่อกับ Stripe");
      setBillingLoading(null);
    }
  }

  async function handleOpenPortal() {
    setBillingLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || "ไม่สามารถเปิดหน้าจัดการแพ็กเกจได้");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเปิด Stripe Portal");
      setBillingLoading(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="ACCOUNT / WORKSPACE"
        number="ACCOUNT / 006"
        title={
          <>
            Your image
            <br />
            workspace<span className="text-accent">.</span>
          </>
        }
        description={<>จัดการข้อมูลบัญชี เลือกแพ็กเกจการใช้งาน ตรวจสอบเครดิตคงเหลือ และประวัติการใช้งาน</>}
      />

      <div className="page-wrap">
        {isSuccess && (
          <div className="mb-6 border border-ink bg-surface-alt p-4">
            <p className="text-sm font-semibold text-success">✓ สมัครแพ็กเกจเรียบร้อยแล้ว!</p>
            <p className="mt-1 text-xs text-muted">ระบบกำลังอัปเดตสถานะและเพิ่มเครดิตเข้าสู่บัญชีของคุณ</p>
          </div>
        )}

        {isCanceled && (
          <div className="mb-6 border border-line p-4 text-xs text-muted">
            การทำรายการชำระเงินถูกยกเลิก คุณสามารถเลือกแพ็กเกจและทำรายการใหม่ได้ทุกเมื่อ
          </div>
        )}

        {error && (
          <div role="alert" className="mb-6 border border-danger bg-danger-bg p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Top Section: Profile & Current Subscription Summary */}
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Profile Details */}
          <div className="border border-ink p-6">
            <div className="mb-6 flex items-center justify-between">
              <p className="micro">01 / PROFILE</p>
              <span className="micro text-muted">USER DETAILS</span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium">Display name</label>
                <div className="mt-2 flex gap-2">
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    disabled={isSavingName}
                    placeholder="เช่น AI Creator"
                    className={`form-field flex-1 ${focus}`}
                  />
                  <button
                    type="button"
                    onClick={handleSaveDisplayName}
                    disabled={isSavingName || displayName.trim() === (profile.display_name || "")}
                    className={`btn-primary px-4 text-xs ${focus}`}
                  >
                    {isSavingName ? "…" : "บันทึก"}
                  </button>
                </div>
                {nameSuccess && <p className="mt-1.5 text-xs text-success">✓ บันทึกชื่อเรียบร้อย</p>}
              </div>

              <div>
                <label className="block text-sm font-medium">Email address</label>
                <input
                  value={profile.email}
                  disabled
                  className="form-field mt-2 cursor-not-allowed bg-surface-hover opacity-80"
                />
                <p className="mt-1 text-[11px] text-muted-soft">อีเมลนี้ใช้สำหรับเข้าสู่ระบบ เปลี่ยนเองไม่ได้</p>
              </div>
            </div>

            <div className="mt-8 border-t border-line-soft pt-6">
              <p className="micro mb-4">PREFERENCES</p>
              <div className="flex items-center justify-between border border-line p-4">
                <div>
                  <span className="block text-sm font-medium">Dark mode theme</span>
                  <span className="mt-1 block text-xs text-muted">สลับโหมดมืด / สว่างตามการใช้งาน</span>
                </div>
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Current Plan Card */}
          <div className="border border-ink p-6 flex flex-col justify-between">
            <div>
              <div className="mb-6 flex items-center justify-between">
                <p className="micro">02 / CURRENT PLAN</p>
                <span className="micro uppercase font-bold text-accent">{profile.plan} PLAN</span>
              </div>

              <div className="stat">
                <p className="micro text-muted">AVAILABLE CREDITS</p>
                <p className="mt-2 text-4xl font-extrabold tracking-tight font-mono">{profile.credits}</p>
                <p className="mt-1 text-xs text-muted">
                  {profile.plan === "free" ? "แพ็กเกจฟรี 20 เครดิตแรกเข้า" : `สถานะ: ${profile.subscription_status}`}
                </p>
              </div>

              {profile.current_period_end && (
                <div className="mt-4 border-t border-line-soft pt-3">
                  <p className="micro text-muted">NEXT BILLING CYCLE</p>
                  <p className="mt-1 text-xs font-mono">{formatDate(profile.current_period_end)}</p>
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-line-soft pt-4">
              {profile.stripe_customer_id ? (
                <button
                  type="button"
                  disabled={billingLoading !== null}
                  onClick={handleOpenPortal}
                  className={`btn-outline w-full text-xs font-mono uppercase tracking-wider ${focus}`}
                >
                  {billingLoading === "portal" ? "กำลังเปิด..." : "จัดการการสมัครสมาชิก (Stripe Portal) ↗"}
                </button>
              ) : (
                <p className="text-center text-xs text-muted">เลือกแพ็กเกจด้านล่างเพื่อเพิ่มเครดิตและฟีเจอร์ระดับโปร</p>
              )}
            </div>
          </div>
        </div>

        {/* Pricing / Subscription Tiers Section */}
        <div className="mt-10 border-t border-ink pt-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="micro">03 / SUBSCRIPTION PLANS</p>
              <h2 className="mt-1 text-2xl font-semibold">Choose the right plan for your workflow</h2>
            </div>
            <span className="font-mono text-xs text-muted">SECURED BY STRIPE</span>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {PLANS.map((planItem) => {
              const isCurrent = profile.plan === planItem.id;
              const isPro = planItem.id === "pro";
              const isBusiness = planItem.id === "business";

              return (
                <div
                  key={planItem.id}
                  className={`flex flex-col justify-between border p-6 transition-all ${
                    isCurrent ? "border-2 border-accent bg-surface-alt" : "border-ink bg-panel"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold">{planItem.name}</h3>
                      {isCurrent && (
                        <span className="border border-accent bg-paper px-2 py-0.5 text-[10px] font-mono font-semibold text-accent uppercase">
                          CURRENT
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <span className="text-3xl font-extrabold">{planItem.monthlyPriceLabel}</span>
                    </div>

                    <p className="mt-2 text-xs font-medium text-muted">
                      {planItem.monthlyCredits.toLocaleString()} เครดิต / เดือน
                    </p>

                    <ul className="mt-6 space-y-2.5 border-t border-line-soft pt-5 text-xs text-muted">
                      {planItem.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="text-accent font-bold">✓</span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    {isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="w-full border border-line bg-surface-hover py-3 text-xs font-mono uppercase tracking-wider text-muted opacity-80"
                      >
                        ACTIVE PLAN
                      </button>
                    ) : isPro || isBusiness ? (
                      <button
                        type="button"
                        disabled={billingLoading !== null}
                        onClick={() => handleCheckout(planItem.id as "pro" | "business")}
                        className={`btn-primary w-full text-xs font-mono uppercase tracking-wider ${focus}`}
                      >
                        {billingLoading === planItem.id ? "กำลังไปที่ STRIPE..." : `SUBSCRIBE ${planItem.name.toUpperCase()} ↗`}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full border border-line py-3 text-xs font-mono uppercase tracking-wider text-muted"
                      >
                        DEFAULT FREE
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Credit Usage History (Ledger) */}
        <div className="mt-10 border-t border-ink pt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="micro">04 / CREDIT HISTORY</p>
              <h2 className="mt-1 text-lg font-semibold">Recent Usage & Grants</h2>
            </div>
            <span className="font-mono text-xs text-muted">{initialLedger.length} RECENT RECORDS</span>
          </div>

          {initialLedger.length === 0 ? (
            <div className="border border-line bg-panel p-8 text-center text-sm text-muted">
              ยังไม่มีประวัติการใช้เครดิต เมื่อใช้งานระบบสร้างหรือขยายภาพ รายการจะแสดงที่นี่
            </div>
          ) : (
            <div className="overflow-x-auto border border-ink">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-ink bg-surface-hover font-mono uppercase">
                  <tr>
                    <th className="p-3">วันที่ / เวลา</th>
                    <th className="p-3">รายการ / เครื่องมือ</th>
                    <th className="p-3 text-right">จำนวนเครดิต</th>
                    <th className="p-3 text-right">ยอดคงเหลือ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft">
                  {initialLedger.map((row) => {
                    const isPositive = row.delta > 0;
                    return (
                      <tr key={row.id} className="hover:bg-surface-hover">
                        <td className="p-3 font-mono text-muted">{formatDate(row.created_at)}</td>
                        <td className="p-3 font-medium">{toolLabel(row.tool, row.reason)}</td>
                        <td className={`p-3 text-right font-mono font-bold ${isPositive ? "text-success" : "text-danger"}`}>
                          {isPositive ? `+${row.delta}` : row.delta}
                        </td>
                        <td className="p-3 text-right font-mono font-semibold">{row.balance_after}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
