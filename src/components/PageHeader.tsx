import type { ReactNode } from "react";

export default function PageHeader({ eyebrow, title, description, number, children }: { eyebrow: string; title: ReactNode; description: ReactNode; number: string; children?: ReactNode }) {
  return <header className="page-wrap page-head">
    <div><p className="micro mb-4 text-accent-dark">{eyebrow}</p><h1 className="text-5xl font-semibold leading-[.93] tracking-[-.07em] sm:text-7xl">{title}</h1></div>
    <div className="flex flex-col justify-end"><p className="micro mb-3 text-muted">{number}</p><p className="text-sm leading-6 text-muted-soft">{description}</p>{children}</div>
  </header>;
}
