"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";
import type { PlanId } from "@/lib/plans";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

type PromoPlan = {
  id: "pro" | "business";
  name: string;
  badge: string;
  regularPrice: string;
  promoPrice: string;
  period: string;
  credits: number;
  highlight: boolean;
  features: string[];
};

const PROMO_PLANS: PromoPlan[] = [
  {
    id: "pro",
    name: "Creator Pro",
    badge: "⚡ ยอดนิยมอันดับ 1",
    regularPrice: "฿590",
    promoPrice: "฿299",
    period: "/เดือน",
    credits: 500,
    highlight: true,
    features: [
      "500 เครดิตเต็มทุกเดือน",
      "ขยายภาพ 4K Vivid Dehaze ลบหมอก",
      "Product Studio สร้าง 4 มุมมองพร้อมกัน",
      "คิวประมวลผลด่วน (Priority Queue)",
      "ไม่มีลายน้ำ สิทธิ์ใช้งานเชิงพาณิชย์ 100%",
    ],
  },
  {
    id: "business",
    name: "Business Studio",
    badge: "🔥 คุ้มค่าสูงสุดสำหรับร้านค้า",
    regularPrice: "฿1,990",
    promoPrice: "฿999",
    period: "/เดือน",
    credits: 2000,
    highlight: false,
    features: [
      "2,000 เครดิตเต็มทุกเดือน",
      "สร้างภาพสินค้าและโฆษณาได้ไม่อั้น",
      "ความเร็วประมวลผลสูงสุด (Ultra Fast)",
      "รองรับการทำงานหลายคนพร้อมกัน",
      "Dedicated Support 24/7",
    ],
  },
];

const TOPUP_BUNDLES = [
  {
    id: "topup-starter",
    name: "Starter Pack",
    price: "฿99",
    credits: "100 เครดิต",
    unitPrice: "ตกรูปละ ~0.99 บาท",
    badge: "ไม่มีวันหมดอายุ",
    desc: "เหมาะสำหรับทดลองทำภาพสินค้าชิ้นแรก",
  },
  {
    id: "topup-merchant",
    name: "Merchant Pack",
    price: "฿290",
    credits: "350 เครดิต (+50 โบนัส)",
    unitPrice: "ตกรูปละ ~0.82 บาท",
    badge: "★ ขายดีสุด",
    desc: "สำหรับร้านค้าออนไลน์ ถ่ายสินค้า 5-10 ชิ้น",
  },
  {
    id: "topup-pro",
    name: "Pro Studio Pack",
    price: "฿590",
    credits: "800 เครดิต (+150 โบนัส)",
    unitPrice: "ตกรูปละ ~0.73 บาท",
    badge: "สุดคุ้ม",
    desc: "สำหรับสตูดิโอและแบรนด์ ทำคอนเทนต์ประจำเดือน",
  },
  {
    id: "topup-agency",
    name: "Agency Pack",
    price: "฿1,490",
    credits: "2,500 เครดิต (+500 โบนัส)",
    unitPrice: "ตกรูปละ ~0.59 บาท",
    badge: "ประหยัด 40%",
    desc: "สำหรับเอเจนซี่ ยิงแอดทุกแพลตฟอร์ม",
  },
];

export default function PromotionsClient({
  currentPlan,
}: {
  currentPlan: PlanId;
  currentCredits: number;
}) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout(planId: "pro" | "business") {
    setLoadingPlan(planId);
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
      setLoadingPlan(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="PROMOTIONS & OFFERS"
        number="SPECIAL / 007"
        title={
          <>
            Special Deals.
            <br />
            Upgrade your Studio<span className="text-accent">.</span>
          </>
        }
        description={<>ดีลสุดพิเศษและแพ็กเกจราคาประหยัดสำหรับครีเอเตอร์และร้านค้าออนไลน์</>}
      />

      <div className="page-wrap">
        {error && (
          <div role="alert" className="mb-6 border border-danger bg-danger-bg p-4 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Hero Promotion Banner */}
        <div className="mb-10 border-2 border-accent bg-surface-alt p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="border border-accent bg-paper px-2.5 py-1 font-mono text-xs font-bold text-accent uppercase">
                ⚡ FLASH SALE 50% OFF
              </span>
              <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                เริ่มต้นยกระดับภาพสินค้าสู่ระดับมืออาชีพ
              </h2>
              <p className="mt-2 text-sm text-muted">
                สมัครแพ็กเกจวันนี้ รับส่วนลดทันที 50% พร้อมเครดิตสร้างภาพและขยาย 4K ได้ทันที
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs text-muted block">PROMO CODE</span>
              <span className="mt-1 inline-block border border-ink bg-paper px-3 py-1.5 font-mono text-sm font-bold">
                AUTO-APPLIED ✓
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Subscription Special Tiers */}
        <div className="mb-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="micro">01 / MONTHLY SUBSCRIPTION DEALS</p>
              <h3 className="mt-1 text-xl font-bold">แพ็กเกจรายเดือนสุดคุ้ม (ต่ออายุอัตโนมัติ)</h3>
            </div>
            <span className="font-mono text-xs text-muted">SECURED BY STRIPE</span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {PROMO_PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col justify-between border p-6 md:p-8 transition-all ${
                    plan.highlight
                      ? "border-2 border-accent bg-surface-alt shadow-sm"
                      : "border-ink bg-panel"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-accent">{plan.badge}</span>
                      {isCurrent && (
                        <span className="border border-line bg-paper px-2 py-0.5 font-mono text-[10px] font-bold">
                          CURRENT PLAN
                        </span>
                      )}
                    </div>

                    <h4 className="mt-3 text-2xl font-bold">{plan.name}</h4>

                    <div className="mt-4 flex items-baseline gap-3">
                      <span className="text-4xl font-extrabold text-ink">{plan.promoPrice}</span>
                      <span className="font-mono text-sm text-muted">{plan.period}</span>
                      <span className="text-sm font-medium text-muted line-through">
                        {plan.regularPrice}
                      </span>
                    </div>

                    <p className="mt-2 font-mono text-xs font-semibold text-accent">
                      รับ {plan.credits.toLocaleString()} เครดิต / เดือน
                    </p>

                    <ul className="mt-6 space-y-3 border-t border-line-soft pt-5 text-xs text-muted">
                      {plan.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="font-bold text-accent">✓</span>
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
                    ) : (
                      <button
                        type="button"
                        disabled={loadingPlan !== null}
                        onClick={() => handleCheckout(plan.id)}
                        className={`btn-primary w-full text-xs font-mono uppercase tracking-wider ${focus}`}
                      >
                        {loadingPlan === plan.id
                          ? "กำลังเปิด STRIPE..."
                          : `GET ${plan.name.toUpperCase()} ↗`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top-up Credit Bundles Section */}
        <div className="border-t border-ink pt-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="micro">02 / TOP-UP PACKS</p>
              <h3 className="mt-1 text-xl font-bold">แพ็กเกจเติมเครดิตแบบไม่หมดอายุ</h3>
              <p className="mt-1 text-xs text-muted">ซื้อครั้งเดียว เครดิตสะสมได้ ไม่มีวันหมดอายุ</p>
            </div>
            <span className="font-mono text-xs text-muted">PAY AS YOU GO</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOPUP_BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className="flex flex-col justify-between border border-line bg-panel p-5 transition-all hover:border-ink"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase text-accent font-bold">
                      {bundle.badge}
                    </span>
                  </div>

                  <h4 className="mt-2 text-lg font-bold">{bundle.name}</h4>
                  <p className="mt-3 text-2xl font-extrabold">{bundle.price}</p>
                  <p className="mt-1 font-mono text-xs font-semibold text-ink">{bundle.credits}</p>
                  <p className="mt-1 font-mono text-[11px] text-muted">{bundle.unitPrice}</p>
                  <p className="mt-3 text-xs leading-5 text-muted-soft">{bundle.desc}</p>
                </div>

                <div className="mt-6 border-t border-line-soft pt-4">
                  <a
                    href="/account"
                    className={`btn-outline block w-full text-center text-[11px] font-mono uppercase tracking-wider ${focus}`}
                  >
                    ดูรายละเอียดที่บัญชี ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Upgrade Section */}
        <div className="mt-12 border-t border-ink pt-10">
          <p className="micro mb-4">STUDIO BENEFITS</p>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="border border-line p-5">
              <span className="micro text-accent">01 / COMMERCE READY</span>
              <h4 className="mt-2 text-base font-bold">4 มุมมองพร้อมลงขายทันที</h4>
              <p className="mt-2 text-xs leading-5 text-muted">
                ไม่ต้องเสียเวลาถ่ายหลายรอบ ได้ภาพครบทั้งมุมตรง มุมเฉียง มุมท็อป และมุมจัดฉากพร้อมใช้
              </p>
            </div>
            <div className="border border-line p-5">
              <span className="micro text-accent">02 / 4K RESOLUTION</span>
              <h4 className="mt-2 text-base font-bold">คมชัดสูงสุด ลบหมอก ปรับสีสด</h4>
              <p className="mt-2 text-xs leading-5 text-muted">
                เทคโนโลยี Topaz AI ขยายภาพระดับ 4K คมกริบ ไร้รอยแตก เหมาะสำหรับพิมพ์ป้ายและแบนเนอร์
              </p>
            </div>
            <div className="border border-line p-5">
              <span className="micro text-accent">03 / COMMERCIAL LICENSE</span>
              <h4 className="mt-2 text-base font-bold">สิทธิ์การค้า 100% ไร้ลายน้ำ</h4>
              <p className="mt-2 text-xs leading-5 text-muted">
                นำภาพไปยิงแอด ทำโฆษณาใน Shopee, Lazada, TikTok และ Facebook ได้อย่างถูกลิขสิทธิ์
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
