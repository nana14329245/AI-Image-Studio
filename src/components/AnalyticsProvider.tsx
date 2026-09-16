"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { capturePageView, initAnalytics } from "@/lib/analytics";

function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    // The query string is dropped: it carries the ?next= redirect target and
    // Stripe's session id, neither of which belongs in an analytics event.
    capturePageView(pathname);
  }, [pathname, searchParams]);

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
