"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";

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
    AI<span className="mx-1 text-accent">/</span>IMAGE<span className="ml-2 align-top text-[9px] tracking-normal">STUDIO</span>
  </Link>;
}

export default function StudioShell({
  children,
  email,
  displayName,
  credits,
  creditsCap,
  planName,
}: {
  children: ReactNode;
  email: string;
  displayName: string | null;
  credits: number;
  creditsCap: number;
  planName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const pct = creditsCap > 0 ? Math.max(4, Math.min(100, Math.round((credits / creditsCap) * 100))) : 0;
  const low = creditsCap > 0 && credits / creditsCap < 0.15;

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <div className="studio-shell">
    <aside className="studio-sidebar">
      <div className="flex items-center justify-between border-b border-ink px-5 py-6">
        <div><Brand /><p className="micro mt-3 text-muted">IMAGE WORKSPACE / 2026</p></div>
        <ThemeToggle />
      </div>
      <nav className="flex-1 px-3 py-5" aria-label="Main navigation">
        {items.map((item) => <div key={item.href}>
          {item.section && <p className="micro mb-2 mt-5 px-3 text-muted-soft">{item.section}</p>}
          <Link href={item.href} className={`nav-item control-focus ${pathname === item.href ? "active" : ""}`}>
            <span aria-hidden="true" className="w-5 text-center font-mono">{item.icon}</span><span>{item.label}</span>
          </Link>
        </div>)}
      </nav>
      <div className="border-t border-line p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="micro">CREDITS</span>
          <span className="font-mono text-xs">{credits}{creditsCap > 0 ? ` / ${creditsCap}` : ""}</span>
        </div>
        <div className="h-1 bg-track"><div className={`h-1 ${low ? "bg-accent" : "bg-ink"}`} style={{ width: `${pct}%` }} /></div>
        <p className="mt-3 truncate text-xs text-muted" title={email}>{displayName || email} · {planName}</p>
        <button onClick={handleSignOut} disabled={signingOut} className="mt-3 flex w-full items-center justify-between border border-line px-3 py-2 text-left text-xs hover:bg-surface-hover disabled:opacity-50">
          <span>ออกจากระบบ</span>
          {signingOut ? <span className="spinner" aria-hidden="true" /> : <span aria-hidden="true">↩</span>}
        </button>
      </div>
    </aside>
    <div className="mobile-bar">
      <Brand />
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/gallery" className="micro control-focus">GALLERY ↗</Link>
      </div>
    </div>
    <main className="studio-main">{children}</main>
  </div>;
}
