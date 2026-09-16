"use client";

import posthog from "posthog-js";

/**
 * Product analytics, deliberately narrow.
 *
 * The question this exists to answer is where people stop before paying, so it
 * records a small set of named funnel events and page views. Autocapture and
 * session replay are off: this app's forms hold a seller's own product names and
 * selling points, and its previews hold their photographs — none of that belongs
 * in an analytics vendor to answer a funnel question.
 *
 * Every call is a no-op until NEXT_PUBLIC_POSTHOG_KEY is set, so the app runs
 * unchanged for anyone who clones it without an analytics account. With a key,
 * nothing loads until the visitor accepts analytics in the consent banner — see
 * src/lib/consent.ts and AnalyticsProvider.
 */

export type AnalyticsEvent =
  | "signup_completed"
  | "generation_started"
  | "generation_completed"
  | "generation_failed"
  | "checkout_started";

let started = false;
// The signed-in user, remembered so consent given after sign-in still ties events to the account.
let pendingIdentity: string | null = null;

function config() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com";
  return { key, host };
}

export function isAnalyticsEnabled(): boolean {
  return config() !== null;
}

/** Starts analytics. Call only after the visitor has consented. */
export function initAnalytics(): void {
  if (typeof window === "undefined") return;
  const settings = config();
  if (!settings) return;
  if (started) {
    // Consent given again after being withdrawn on this page.
    posthog.set_config({ disable_persistence: false });
    posthog.opt_in_capturing();
    return;
  }

  posthog.init(settings.key, {
    api_host: settings.host,
    capture_pageview: false, // sent manually, so client-side route changes count
    autocapture: false,
    disable_session_recording: true,
    persistence: "localStorage+cookie",
    // Opting out also stops PostHog writing to the browser and deletes what it wrote.
    opt_out_persistence_by_default: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
  });
  started = true;
  if (pendingIdentity) posthog.identify(pendingIdentity);
}

/**
 * Stops sending events and removes what PostHog stored in the browser, when
 * consent is refused or withdrawn. reset() alone only swaps in a new anonymous
 * id, which would leave an analytics identifier behind without consent.
 */
export function stopAnalytics(): void {
  if (typeof window === "undefined") return;
  if (started) {
    posthog.opt_out_capturing();
    posthog.reset(); // a later re-consent starts as a new anonymous visitor
    posthog.set_config({ disable_persistence: true });
  }
  // Also on a fresh page load after refusing, when PostHog never started but an
  // earlier visit with consent left its identifiers behind.
  clearStoredAnalyticsIds();
}

function clearStoredAnalyticsIds(): void {
  try {
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("ph_")) window.localStorage.removeItem(key);
    }
  } catch {
    // Storage unavailable: nothing was persisted there.
  }
  for (const cookie of document.cookie.split(";")) {
    const name = cookie.split("=")[0].trim();
    if (name.startsWith("ph_")) document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function capturePageView(path: string): void {
  if (!started) return;
  posthog.capture("$pageview", { $current_url: path });
}

/**
 * Properties are limited to values chosen from a fixed list — a tool name, a plan
 * id, a credit cost. Never pass anything the user typed or uploaded.
 */
export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>): void {
  if (!started) return;
  posthog.capture(event, properties);
}

/** Ties events to an account after sign-in. Called with the Supabase user id only. */
export function identify(userId: string): void {
  pendingIdentity = userId;
  if (!started) return;
  posthog.identify(userId);
}

export function resetAnalytics(): void {
  pendingIdentity = null;
  if (!started) return;
  posthog.reset();
}
