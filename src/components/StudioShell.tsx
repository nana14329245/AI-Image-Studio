"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const items = [
  { href: "/", label: "Dashboard", icon: "⌂" },
  { href: "/upscale", label: "4K Upscale", icon: "↗", section: "TOOLS" },
  { href: "/product", label: "Product Studio", icon: "□" },
  { href: "/ads", label: "Ad Studio", icon: "▣" },
  { href: "/portrait", label: "Professional Photo", icon: "◎" },
  { href: "/gallery", label: "Gallery", icon: "▦", section: "LIBRARY" },
  { href: "/account", label: "Account", icon: "⚙" },
];

function Brand() {
  return <Link href="/" aria-label="AI Image Studio home" className="text-xl font-extrabold tracking-[-0.07em] control-focus">
    AI<span className="mx-1 text-[#ed5127]">/</span>IMAGE<span className="ml-2 align-top text-[9px] tracking-normal">STUDIO</span>
  </Link>;
}

export default function StudioShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="studio-shell">
    <aside className="studio-sidebar">
      <div className="border-b border-[#1d1e1b] px-5 py-6"><Brand /><p className="micro mt-3 text-[#6b6d65]">IMAGE WORKSPACE / 2026</p></div>
      <nav className="flex-1 px-3 py-5" aria-label="Main navigation">
        {items.map((item, i) => <div key={item.href}>
          {item.section && <p className="micro mb-2 mt-5 px-3 text-[#85877e]">{item.section}</p>}
          <Link href={item.href} className={`nav-item control-focus ${pathname === item.href ? "active" : ""}`}>
            <span aria-hidden="true" className="w-5 text-center font-mono">{item.icon}</span><span>{item.label}</span>
          </Link>
        </div>)}
      </nav>
      <div className="border-t border-[#bfc0b8] p-4">
        <div className="mb-2 flex items-center justify-between"><span className="micro">CREDITS</span><span className="font-mono text-xs">680</span></div>
        <div className="h-1 bg-[#d4d4cc]"><div className="h-1 w-[68%] bg-[#1d1e1b]" /></div>
        <p className="mt-3 text-xs text-[#6b6d65]">Free workspace · UI preview</p>
      </div>
    </aside>
    <div className="mobile-bar"><Brand /><Link href="/gallery" className="micro control-focus">GALLERY ↗</Link></div>
    <main className="studio-main">{children}</main>
  </div>;
}
