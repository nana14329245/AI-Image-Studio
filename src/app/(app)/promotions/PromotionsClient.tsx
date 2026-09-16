"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import { TOOL_CREDIT_COST, planById, type PlanId } from "@/lib/plans";
import { usePlanActions } from "@/components/usePlanActions";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Name, price and credit allowance come from PLANS so this page cannot drift
 * from the pricing shown on the landing page. Only the sales copy lives here.
 */
type PromoPlan = {
  id: "pro" | "business";
  badge: string;
  highlight: boolean;
  features: string[];
};

const PROMO_PLANS: PromoPlan[] = [
  {
    id: "pro",
    badge: "สำหรับร้านค้าที่เพิ่งเริ่มต้น",
    highlight: true,
    features: [
      "ขยายภาพ 4K ด้วย Topaz ลบหมอก ปรับสีให้สด",
      "Product Studio สร้างครบ 4 มุมมองในครั้งเดียว",
      "คิวประมวลผลเร็วกว่าแพ็กฟรี",
      "ใช้ภาพเพื่อการค้าได้เต็มที่",
    ],
  },
  {
    id: "business",
    badge: "สำหรับร้านที่ลงสินค้าจำนวนมาก",
    highlight: false,
    features: [
      "เครดิตมากกว่าแพ็ก Pro 4 เท่า",
      "คิวประมวลผลเร็วที่สุด",
      "สร้างภาพต่อเนื่องได้ถี่กว่าทุกแพ็ก",
      "ใช้ภาพเพื่อการค้าได้เต็มที่",
    ],
  },
];

/**
 * Planned one-off credit packs. There is no Stripe price and no purchase route
 * for these yet — /api/billing/checkout only handles the two subscriptions — so
 * they are shown as upcoming rather than as something that can be bought today.
 */
const TOPUP_BUNDLES = [
  {
    id: "topup-starter",
    name: "Starter Pack",
    price: "฿99",
    credits: "100 เครดิต",
    desc: "เหมาะสำหรับทดลองทำภาพสินค้าชิ้นแรก",
  },
  {
    id: "topup-merchant",
    name: "Merchant Pack",
    price: "฿290",
    credits: "350 เครดิต",
    desc: "สำหรับร้านค้าออนไลน์ ถ่ายสินค้า 5-10 ชิ้น",
  },
  {
    id: "topup-pro",
    name: "Pro Studio Pack",
    price: "฿590",
    credits: "800 เครดิต",
    desc: "สำหรับสตูดิโอและแบรนด์ ทำคอนเทนต์ประจำเดือน",
  },
  {
    id: "topup-agency",
    name: "Agency Pack",
    price: "฿1,490",
    credits: "2,500 เครดิต",
    desc: "สำหรับเอเจนซี่ ยิงแอดทุกแพลตฟอร์ม",
  },
];

export default function PromotionsClient({
  currentPlan,
  subscribed,
}: {
  currentPlan: PlanId;
  /** True when the customer has a live subscription and should switch plan rather than subscribe again. */
  subscribed: boolean;
}) {
  const planActions = usePlanActions();

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
        {planActions.notice && (
          <div role="status" className="mb-6 border border-ink bg-surface-alt p-4 text-sm text-success">
            {planActions.notice}
          </div>
        )}

        {planActions.error && (
          <div role="alert" className="mb-6 border border-danger bg-danger-bg p-4 text-sm text-danger">
            {planActions.error}
          </div>
        )}

        {/* Monthly Subscription Special Tiers */}
        <div className="mb-12">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="micro">01 / MONTHLY SUBSCRIPTION DEALS</p>
              <h3 className="mt-1 text-xl font-bold">แพ็กเกจรายเดือนสุดคุ้ม (ต่ออายุอัตโนมัติ)</h3>
              <p className="mt-1 text-xs text-muted">
                ยกเลิกได้ทุกเมื่อ ใช้งานได้จนสิ้นรอบบิลที่ชำระไว้ · เครดิตที่ไม่ได้ใช้ทบได้ไม่เกิน 2 เท่าของแพ็ก · ไม่มีใบกำกับภาษี ·{" "}
                <Link href="/terms" className="underline underline-offset-4">ข้อตกลง</Link> ·{" "}
                <Link href="/refund" className="underline underline-offset-4">การยกเลิกและคืนเงิน</Link>
              </p>
            </div>
            <span className="font-mono text-xs text-muted">SECURED BY STRIPE</span>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {PROMO_PLANS.map((promo) => {
              const plan = planById(promo.id);
              const isCurrent = currentPlan === promo.id;
              const productImages = Math.floor(plan.monthlyCredits / TOOL_CREDIT_COST.product);

              return (
                <div
                  key={promo.id}
                  className={`flex flex-col justify-between border p-6 md:p-8 transition-all ${
                    promo.highlight
                      ? "border-2 border-accent bg-surface-alt shadow-sm"
                      : "border-ink bg-panel"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-accent">{promo.badge}</span>
                      {isCurrent && (
                        <span className="shrink-0 border border-line bg-paper px-2 py-0.5 font-mono text-[10px] font-bold">
                          CURRENT PLAN
                        </span>
                      )}
                    </div>

                    <h4 className="mt-3 text-2xl font-bold">{plan.name}</h4>

                    <p className="mt-4 text-4xl font-extrabold text-ink">{plan.monthlyPriceLabel}</p>

                    <p className="mt-2 font-mono text-xs font-semibold text-accent">
                      {plan.monthlyCredits.toLocaleString()} เครดิต / เดือน · ประมาณ {productImages} ภาพสินค้า
                    </p>

                    <ul className="mt-6 space-y-3 border-t border-line-soft pt-5 text-xs text-muted">
                      {promo.features.map((feat) => (
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
                        disabled={planActions.busy !== null}
                        onClick={() =>
                          subscribed ? planActions.changePlan(promo.id, currentPlan) : planActions.subscribe(promo.id)
                        }
                        className={`btn-primary w-full text-xs font-mono uppercase tracking-wider ${focus}`}
                      >
                        {planActions.busy === promo.id
                          ? subscribed ? "กำลังเปลี่ยนแพ็กเกจ..." : "กำลังเปิด STRIPE..."
                          : subscribed ? `เปลี่ยนเป็น ${plan.name} ↗` : `GET ${plan.name.toUpperCase()} ↗`}
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
              <h3 className="mt-1 flex flex-wrap items-center gap-3 text-xl font-bold">
                แพ็กเกจเติมเครดิตแบบซื้อครั้งเดียว
                <span className="badge badge-accent">เร็วๆ นี้</span>
              </h3>
              <p className="mt-1 text-xs text-muted">ยังเปิดให้ซื้อไม่ได้ ตอนนี้เติมเครดิตได้ผ่านแพ็กเกจรายเดือนด้านบน</p>
            </div>
            <span className="font-mono text-xs text-muted">COMING SOON</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TOPUP_BUNDLES.map((bundle) => (
              <div
                key={bundle.id}
                className="flex flex-col justify-between border border-line bg-panel p-5 transition-all hover:border-ink"
              >
                <div>
                  <h4 className="text-lg font-bold">{bundle.name}</h4>
                  <p className="mt-3 text-2xl font-extrabold">{bundle.price}</p>
                  <p className="mt-1 font-mono text-xs font-semibold text-ink">{bundle.credits}</p>
                  <p className="mt-3 text-xs leading-5 text-muted-soft">{bundle.desc}</p>
                </div>

                <div className="mt-6 border-t border-line-soft pt-4">
                  <button
                    type="button"
                    disabled
                    className="btn-outline w-full text-center text-[11px] font-mono uppercase tracking-wider"
                  >
                    ยังไม่เปิดขาย
                  </button>
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
              <h4 className="mt-2 text-base font-bold">ใช้เพื่อการค้าได้เต็มที่</h4>
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
