/**
 * Client-side error monitoring (Sentry). See src/instrumentation.ts for why
 * this is a no-op without NEXT_PUBLIC_SENTRY_DSN, and why sendDefaultPii and
 * session replay stay off — the same reasoning as PostHog in src/lib/analytics.ts:
 * this app's screens hold a seller's own product photos and a customer's
 * portraits, none of which belongs with an error-tracking vendor.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}
