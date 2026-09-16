"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { identify, resetAnalytics } from "@/lib/analytics";
import { createClient } from "@/lib/supabase/client";

const items = [
  { href: "/dashboard", label: "Dashboard", icon: "⌂" },
  { href: "/upscale", label: "4K Upscale", icon: "↗", section: "TOOLS" },
  { href: "/product", label: "Product Studio", icon: "□" },
  { href: "/ads", label: "Ad Studio", icon: "▣" },
  { href: "/portrait", label: "Professional Photo", icon: "◎" },
  { href: "/gallery", label: "Gallery", icon: "▦", section: "LIBRARY" },
  { href: "/account", label: "Account", icon: "⚙" },
  { href: "/promotions", label: "Promotions", icon: "★" },
  { href: "/brand-kit", label: "Brand Kit", icon: "◆" },
];

function Brand() {
  return <Link href="/dashboard" aria-label="AI Image Studio home" className="text-xl font-extrabold tracking-[-0.07em] control-focus">
    AI<span className="mx-1 text-accent">/</span>IMAGE<span className="ml-2 align-top text-[9px] tracking-normal">STUDIO</span>
  </Link>;
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return <>
    {items.map((item) => <div key={item.href}>
      {item.section && <p className="micro mb-2 mt-5 px-3 text-muted-soft">{item.section}</p>}
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={pathname === item.href ? "page" : undefined}
        className={`nav-item control-focus ${pathname === item.href ? "active" : ""}`}
      >
        <span aria-hidden="true" className="w-5 text-center font-mono">{item.icon}</span><span>{item.label}</span>
      </Link>
    </div>)}
  </>;
}

function CreditMeter({ credits, creditsCap }: { credits: number; creditsCap: number }) {
  const pct = creditsCap > 0 ? Math.max(4, Math.min(100, Math.round((credits / creditsCap) * 100))) : 0;
  const low = creditsCap > 0 && credits / creditsCap < 0.15;
  return <>
    <div className="mb-2 flex items-center justify-between">
      <span className="micro">CREDITS</span>
      <span className="font-mono text-xs">{credits}{creditsCap > 0 ? ` / ${creditsCap}` : ""}</span>
    </div>
    <div className="h-1 bg-track"><div className={`h-1 ${low ? "bg-accent" : "bg-ink"}`} style={{ width: `${pct}%` }} /></div>
  </>;
}

export default function StudioShell({
  children,
  userId,
  email,
  displayName,
  credits,
  creditsCap,
  planName,
}: {
  children: ReactNode;
  userId: string;
  email: string;
  displayName: string | null;
  credits: number;
  creditsCap: number;
  planName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const low = creditsCap > 0 && credits / creditsCap < 0.15;

  // Close the drawer whenever the route changes — including browser back/forward —
  // so it never stays open covering the new page. Adjusting state during render is
  // React's documented alternative to doing this in an effect.
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    // Wait a frame: the panel is visibility:hidden until the open class paints,
    // and a hidden element cannot take focus.
    const frame = requestAnimationFrame(() => drawerRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  // Only the opaque Supabase id is sent — never the email address.
  useEffect(() => { identify(userId); }, [userId]);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    resetAnalytics();
    router.replace("/login");
    router.refresh();
  }

  const accountFooter = <>
    <CreditMeter credits={credits} creditsCap={creditsCap} />
    <p className="mt-3 truncate text-xs text-muted" title={email}>{displayName || email} · {planName}</p>
    <button onClick={handleSignOut} disabled={signingOut} className="mt-3 flex w-full items-center justify-between border border-line px-3 py-2 text-left text-xs hover:bg-surface-hover disabled:opacity-50">
      <span>ออกจากระบบ</span>
      {signingOut ? <span className="spinner" aria-hidden="true" /> : <span aria-hidden="true">↩</span>}
    </button>
  </>;

  return <div className="studio-shell">
    <aside className="studio-sidebar">
      <div className="flex items-center justify-between border-b border-ink px-5 py-6">
        <div><Brand /><p className="micro mt-3 text-muted">IMAGE WORKSPACE / 2026</p></div>
        <ThemeToggle />
      </div>
      <nav className="flex-1 px-3 py-5" aria-label="Main navigation">
        <NavList pathname={pathname} />
      </nav>
      <div className="border-t border-line p-4">{accountFooter}</div>
    </aside>

    <div className="mobile-bar">
      <Brand />
      <div className="flex items-center gap-3">
        <Link
          href="/account"
          className={`mobile-credits control-focus ${low ? "low" : ""}`}
          aria-label={`เครดิตคงเหลือ ${credits}${creditsCap > 0 ? ` จาก ${creditsCap}` : ""}`}
        >
          <span aria-hidden="true">{credits}</span>
        </Link>
        <ThemeToggle />
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={menuOpen ? "ปิดเมนู" : "เปิดเมนู"}
          className="mobile-menu-button control-focus"
        >
          <span aria-hidden="true">{menuOpen ? "✕" : "☰"}</span>
        </button>
      </div>
    </div>

    {menuOpen && <div className="drawer-backdrop" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
    <div
      id="mobile-nav-drawer"
      ref={drawerRef}
      tabIndex={-1}
      className={`drawer-panel ${menuOpen ? "open" : ""}`}
      aria-hidden={!menuOpen}
    >
      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Main navigation">
        <NavList pathname={pathname} onNavigate={() => setMenuOpen(false)} />
      </nav>
      <div className="border-t border-line p-4">{accountFooter}</div>
    </div>

    <main className="studio-main">{children}</main>
  </div>;
}
