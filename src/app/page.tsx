import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SiteFooter from "@/components/SiteFooter";
import { PLANS, SIGNUP_CREDITS } from "@/lib/plans";

const TOOLS = [
  { href: "/upscale", title: "4K Upscale", text: "เพิ่มความละเอียด 2× หรือ 4× พร้อมรักษารายละเอียดของภาพ", symbol: "↗" },
  { href: "/product", title: "Product Studio", text: "เปลี่ยนรูปสินค้าธรรมดาให้เป็นภาพพร้อมขายสำหรับ Marketplace", symbol: "□" },
  { href: "/ads", title: "Ad Studio", text: "สร้างภาพโฆษณาหลายสัดส่วน พร้อมข้อความและ CTA", symbol: "▣" },
  { href: "/portrait", title: "Professional Photo", text: "จัดภาพโปรไฟล์ให้สุภาพ พร้อมพื้นหลังและขนาดสำหรับสมัครงาน", symbol: "◎" },
];

const SHOWCASE = [
  { src: "/landing/product-1.jpg", caption: "Marketplace / สตูดิโอขาว" },
  { src: "/landing/product-2.jpg", caption: "Marketplace / มุมท็อปดาวน์" },
  { src: "/landing/product-3.jpg", caption: "Marketplace / ฉากไลฟ์สไตล์" },
  { src: "/landing/product-4.jpg", caption: "Marketplace / สตูดิโอเทา" },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  const [free, ...paid] = PLANS;

  return (
    <>
      <header className="border-b border-ink">
        <div className="page-wrap flex items-center justify-between py-5">
          <Link href="/" className="text-xl font-extrabold tracking-[-0.07em] control-focus">
            AI<span className="mx-1 text-accent">/</span>IMAGE<span className="ml-2 align-top text-[9px] tracking-normal">STUDIO</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-outline flex items-center px-5 text-sm control-focus">เข้าสู่ระบบ</Link>
            <Link href="/signup" className="btn-primary flex items-center px-5 text-sm control-focus">สมัครฟรี</Link>
          </div>
        </div>
      </header>

      <section className="grid-paper border-b border-ink">
        <div className="page-wrap py-20 text-center sm:py-28">
          <p className="micro mb-4 text-accent-dark">AI IMAGE STUDIO / สำหรับผู้ขายออนไลน์ไทย</p>
          <h1 className="mx-auto max-w-3xl text-5xl font-semibold leading-[.95] tracking-[-.07em] sm:text-7xl">
            ภาพสินค้ามืออาชีพ<br />สร้างเสร็จในไม่กี่นาที<span className="text-accent">.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-sm leading-6 text-muted-soft sm:text-base">
            ขยายภาพ 4K, ถ่ายภาพสินค้า, สร้างโฆษณา และภาพโปรไฟล์มืออาชีพ — ครบในที่เดียว ด้วยเครดิตชุดเดียว ไม่ต้องสมัครหลายเครื่องมือแยกกัน
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/signup" className="btn-primary flex items-center gap-2 px-8 text-sm control-focus">เริ่มต้นฟรี {SIGNUP_CREDITS} เครดิต ↗</Link>
            <Link href="/login" className="btn-outline flex items-center px-8 text-sm control-focus">เข้าสู่ระบบ</Link>
          </div>
        </div>
      </section>

      <section className="border-b border-ink">
        <div className="page-wrap py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
            <div>
              <p className="micro text-accent-dark">01 / ตัวอย่างผลงานจริง</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">สร้างจากระบบนี้จริง</h2>
            </div>
            <span className="font-mono text-xs text-muted">REAL OUTPUT / NO MOCKUP</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {SHOWCASE.map((item) => (
              <figure key={item.src} className="border border-line bg-surface-alt">
                <img src={item.src} alt={item.caption} className="aspect-square w-full object-cover" />
                <figcaption className="border-t border-line-soft p-3 font-mono text-[10px] text-muted-soft">{item.caption}</figcaption>
              </figure>
            ))}
          </div>
          <p className="mt-4 text-xs text-muted-soft">ภาพตัวอย่างสร้างจริงด้วยเครื่องมือ Product Studio ในระบบนี้ ไม่ใช่ mockup</p>
        </div>
      </section>

      <section className="border-b border-ink">
        <div className="page-wrap py-16">
          <div className="mb-8 border-b border-line pb-3">
            <p className="micro text-accent-dark">02 / เครื่องมือ</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">4 เครื่องมือ เครดิตเดียว</h2>
          </div>
          <div className="card-grid">
            {TOOLS.map((tool) => (
              <Link key={tool.href} href="/signup" className="tool-card control-focus">
                <div>
                  <div className="mb-6 text-4xl font-light">{tool.symbol}</div>
                  <h3 className="text-2xl font-semibold tracking-[-.03em]">{tool.title}</h3>
                  <p className="mt-3 max-w-md text-sm leading-6 text-muted">{tool.text}</p>
                </div>
                <div className="mt-8 flex items-center justify-between border-t border-line-soft pt-4">
                  <span className="micro">เริ่มใช้ฟรี</span>
                  <span aria-hidden="true" className="text-xl">↗</span>
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 border-2 border-accent bg-surface-alt p-6 md:p-8">
            <p className="micro text-accent-dark">จุดต่าง / BRAND KIT</p>
            <h3 className="mt-2 text-xl font-semibold">ตั้งโลโก้และสีแบรนด์ครั้งเดียว ใช้ซ้ำอัตโนมัติทุกภาพ</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">ไม่ต้องมาเลือกโลโก้หรือสีใหม่ทุกครั้งที่สร้างภาพ — อัปโหลดครั้งเดียว ระบบแปะโลโก้และใช้โทนสีแบรนด์ให้อัตโนมัติในภาพสินค้า โฆษณา และภาพโปรไฟล์ทุกใบ</p>
          </div>
        </div>
      </section>

      <section className="border-b border-ink">
        <div className="page-wrap py-16">
          <div className="mb-8 border-b border-line pb-3">
            <p className="micro text-accent-dark">03 / ราคา</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-.03em] sm:text-3xl">เริ่มฟรี อัปเกรดเมื่อพร้อม</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="flex flex-col border border-line bg-panel p-6">
              <p className="font-mono text-xs font-bold text-muted">{free.name.toUpperCase()}</p>
              <p className="mt-3 text-3xl font-extrabold">{free.monthlyPriceLabel}</p>
              <ul className="mt-5 space-y-2 text-xs text-muted">
                {free.features.map((f) => (
                  <li key={f} className="flex items-center gap-2"><span className="font-bold text-accent">✓</span>{f}</li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                <Link href="/signup" className="btn-outline flex items-center justify-center text-sm control-focus">เริ่มต้นฟรี</Link>
              </div>
            </div>
            {paid.map((plan) => (
              <div key={plan.id} className={`flex flex-col border p-6 ${plan.id === "pro" ? "border-2 border-accent bg-surface-alt" : "border-ink bg-panel"}`}>
                <p className="font-mono text-xs font-bold text-accent">{plan.name.toUpperCase()}</p>
                <p className="mt-3 text-3xl font-extrabold">{plan.monthlyPriceLabel}</p>
                <ul className="mt-5 space-y-2 text-xs text-muted">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2"><span className="font-bold text-accent">✓</span>{f}</li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <Link
                    href="/signup"
                    className={`flex items-center justify-center text-sm control-focus ${plan.id === "pro" ? "btn-primary" : "btn-outline"}`}
                  >
                    สมัครแล้วเลือก {plan.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-wrap py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-[-.05em] sm:text-4xl">พร้อมเริ่มต้นหรือยัง<span className="text-accent">?</span></h2>
        <p className="mt-3 text-sm text-muted-soft">สมัครวันนี้ รับ {SIGNUP_CREDITS} เครดิตฟรีทันที ไม่ต้องผูกบัตร</p>
        <Link href="/signup" className="btn-primary mt-6 inline-flex items-center gap-2 px-8 text-sm control-focus">สมัครฟรี ↗</Link>
      </section>

      <SiteFooter />
    </>
  );
}
