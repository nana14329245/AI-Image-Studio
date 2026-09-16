"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { capturePageView, initAnalytics, stopAnalytics } from "@/lib/analytics";
import { useConsent } from "@/lib/consent";

function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const consent = useConsent();

  useEffect(() => {
    // Nothing loads before the visitor accepts. Undecided counts as a refusal.
    if (consent === "granted") initAnalytics();
    else stopAnalytics();
  }, [consent]);

  useEffect(() => {
    // The query string is dropped: it carries the ?next= redirect target and
    // Stripe's session id, neither of which belongs in an analytics event.
    if (consent === "granted") capturePageView(pathname);
  }, [pathname, searchParams, consent]);

  return null;
}

export default function AnalyticsProvider() {
  // useSearchParams needs a Suspense boundary, or every page using this becomes
  // client-rendered on demand.
  return (
    <Suspense fallback={null}>
      <PageViews />
    </Suspense>
  );
}
