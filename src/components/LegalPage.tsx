import Link from "next/link";
import type { ReactNode } from "react";
import SiteFooter, { LEGAL_LINKS } from "@/components/SiteFooter";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/legal";

export type LegalSection = { id: string; title: string; body: ReactNode };

export default function LegalPage({
  path,
  eyebrow,
  title,
  intro,
  sections,
}: {
  path: string;
  eyebrow: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <>
      <header className="border-b border-ink">
        <div className="page-wrap flex items-center justify-between py-5">
          <Link href="/" className="text-xl font-extrabold tracking-[-0.07em] control-focus">
            AI<span className="mx-1 text-accent">/</span>IMAGE<span className="ml-2 align-top text-[9px] tracking-normal">STUDIO</span>
          </Link>
          <Link href="/dashboard" className="btn-outline flex items-center px-5 text-sm control-focus">เข้าใช้งาน</Link>
        </div>
      </header>

      <main className="page-wrap pt-10 sm:pt-14">
        <nav aria-label="เอกสารทางกฎหมาย" className="mb-10 flex flex-wrap gap-2">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.href === path ? "page" : undefined}
              className={`border px-3 py-2 text-xs control-focus ${link.href === path ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <article className="max-w-3xl">
          <p className="micro text-accent-dark">{eyebrow}</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-.05em] sm:text-5xl">{title}</h1>
          <p className="mt-3 font-mono text-xs text-muted">มีผลตั้งแต่ {LEGAL_EFFECTIVE_DATE}</p>
          <div className="mt-6 text-sm leading-7 text-muted">{intro}</div>

          <div className="mt-10 grid gap-10">
            {sections.map((section, index) => (
              <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-6 border-t border-line pt-6">
                <h2 id={`${section.id}-title`} className="text-lg font-semibold tracking-[-.02em]">
                  <span className="mr-3 font-mono text-xs text-accent-dark">{String(index + 1).padStart(2, "0")}</span>
                  {section.title}
                </h2>
                <div className="legal-body mt-3 text-sm leading-7">{section.body}</div>
              </section>
            ))}
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
