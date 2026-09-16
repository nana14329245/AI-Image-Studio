import Link from "next/link";
import CookieSettingsButton from "@/components/CookieSettingsButton";

export const LEGAL_LINKS = [
  { href: "/terms", label: "ข้อตกลงการใช้บริการ" },
  { href: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
  { href: "/refund", label: "นโยบายการยกเลิกและคืนเงิน" },
  { href: "/contact", label: "ติดต่อเรา" },
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-ink py-8">
      <div className="page-wrap flex flex-col items-center gap-4 text-center text-xs text-muted-soft">
        <nav aria-label="ข้อมูลทางกฎหมาย" className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {LEGAL_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="underline-offset-4 hover:underline control-focus">
              {link.label}
            </Link>
          ))}
          <CookieSettingsButton />
        </nav>
        <p className="font-mono">AI / IMAGE STUDIO — เครื่องมือ AI สำหรับผู้ขายออนไลน์ไทย</p>
      </div>
    </footer>
  );
}
