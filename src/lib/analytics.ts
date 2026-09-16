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
 * unchanged for anyone who clones it without an analytics account.
 */

export type AnalyticsEvent =
  | "signup_completed"
  | "generation_started"
  | "generation_completed"
  | "generation_failed"
  | "checkout_started";

let started = false;

function config() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
  if (!key) return null;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://eu.i.posthog.com";
  return { key, host };
}

export function isAnalyticsEnabled(): boolean {
  return config() !== null;
}

export function initAnalytics(): void {
  if (started || typeof window === "undefined") return;
  const settings = config();
  if (!settings) return;

  posthog.init(settings.key, {
    api_host: settings.host,
    capture_pageview: false, // sent manually, so client-side route changes count
    autocapture: false,
    disable_session_recording: true,
    persistence: "localStorage+cookie",
    mask_all_text: true,
    mask_all_element_attributes: true,
  });
  started = true;
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
  if (!started) return;
  posthog.identify(userId);
}

export function resetAnalytics(): void {
  if (!started) return;
  posthog.reset();
}
