import Link from "next/link";
import PageHeader from "@/components/PageHeader";

const tools = [
  { href: "/upscale", number: "001", title: "4K UPSCALE", text: "เพิ่มความละเอียด 2× หรือ 4× พร้อมรักษารายละเอียดของภาพ", meta: "ENHANCE / RESOLUTION", symbol: "↗" },
  { href: "/product", number: "002", title: "PRODUCT STUDIO", text: "เปลี่ยนรูปสินค้าธรรมดาให้เป็นภาพพร้อมขายสำหรับ Marketplace", meta: "COMMERCE / PRODUCT", symbol: "□" },
  { href: "/ads", number: "003", title: "AD STUDIO", text: "สร้างภาพโฆษณาหลายสัดส่วน พร้อมข้อความและ CTA", meta: "CAMPAIGN / CREATIVE", symbol: "▣" },
  { href: "/portrait", number: "004", title: "PROFESSIONAL PHOTO", text: "จัดภาพโปรไฟล์ให้สุภาพ พร้อมพื้นหลังและขนาดสำหรับสมัครงาน", meta: "PROFILE / CAREER", symbol: "◎" },
];

export default function Home() {
  return <>
    <PageHeader eyebrow="AI IMAGE STUDIO / WORKSPACE" number="HOME / 000" title={<>Better images.<br />Built for work<span className="text-[#ed5127]">.</span></>} description={<>เครื่องมือภาพ AI สำหรับงานจริง ตั้งแต่การเพิ่มความคม ไปจนถึงภาพสินค้าและโฆษณา</>} />
    <div className="page-wrap">
      <div className="mb-5 flex items-end justify-between border-b border-[#bfc0b8] pb-3"><p className="micro">SELECT A TOOL</p><span className="font-mono text-xs text-[#6b6d65]">04 MODULES / 01 ACTIVE</span></div>
      <section className="card-grid">
        {tools.map(tool => <Link key={tool.href} href={tool.href} className="tool-card control-focus">
          <span className="tool-number micro text-[#6b6d65]">{tool.number}</span>
          <div><div className="mb-10 text-4xl font-light">{tool.symbol}</div><p className="micro mb-3 text-[#c83c17]">{tool.meta}</p><h2 className="text-3xl font-semibold tracking-[-.05em]">{tool.title}</h2><p className="mt-3 max-w-md text-sm leading-6 text-[#64665e]">{tool.text}</p></div>
          <div className="mt-8 flex items-center justify-between border-t border-[#d0d1c9] pt-4"><span className="micro">OPEN MODULE</span><span className="text-xl">↗</span></div>
        </Link>)}
      </section>
      <section className="mt-16 grid gap-8 border-t border-[#1d1e1b] pt-6 md:grid-cols-[1fr_2fr]">
        <p className="micro">WORKFLOW / 01</p>
        <div className="grid gap-8 sm:grid-cols-3"><div><b className="font-mono text-lg">01</b><p className="mt-2 text-sm font-medium">Upload</p><p className="mt-1 text-xs leading-5 text-[#6b6d65]">เริ่มจากรูปต้นฉบับของคุณ</p></div><div><b className="font-mono text-lg">02</b><p className="mt-2 text-sm font-medium">Configure</p><p className="mt-1 text-xs leading-5 text-[#6b6d65]">เลือกสไตล์ ขนาด หรือแพลตฟอร์ม</p></div><div><b className="font-mono text-lg">03</b><p className="mt-2 text-sm font-medium">Generate</p><p className="mt-1 text-xs leading-5 text-[#6b6d65]">ประมวลผลและบันทึกลง Gallery</p></div></div>
      </section>
    </div>
  </>;
}
