import type { Instrumentation } from "next";

/**
 * Server-side error monitoring (Sentry), deliberately narrow.
 *
 * A no-op until NEXT_PUBLIC_SENTRY_DSN is set, so the app runs unchanged for
 * anyone who clones it without a Sentry account — the same rule src/lib/analytics.ts
 * follows for PostHog. sendDefaultPii stays off: this route runs before any
 * consent banner, so it must never attach request cookies, IP addresses or user
 * identity on its own. Uses the DSN from a browser-safe env var because a
 * Sentry DSN is a write-only, non-secret endpoint — not because this code runs
 * in the browser.
 */
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return;

  const Sentry = await import("@sentry/nextjs");
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
};
