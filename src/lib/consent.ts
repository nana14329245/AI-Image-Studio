"use client";

import { useSyncExternalStore } from "react";

/**
 * The visitor's choice about optional analytics, kept in this browser only.
 *
 * Under the PDPA analytics needs consent, and refusing must be as easy as
 * accepting. Sign-in cookies and the theme cookie are needed to run the site and
 * are not covered by this choice.
 *
 * The stored value carries a version: raising CONSENT_VERSION asks everyone
 * again, which is needed if analytics starts collecting something new.
 */
export type ConsentChoice = "granted" | "denied";

export const CONSENT_STORAGE_KEY = "analytics-consent";
export const CONSENT_VERSION = 1;
const CHANGE_EVENT = "analytics-consent-change";
const OPEN_EVENT = "analytics-consent-open";

/** A stored value from any earlier version, or anything malformed, counts as no choice. */
export function parseConsent(raw: string | null): ConsentChoice | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { version?: unknown; choice?: unknown };
    if (value.version !== CONSENT_VERSION) return null;
    return value.choice === "granted" || value.choice === "denied" ? value.choice : null;
  } catch {
    return null;
  }
}

export function serializeConsent(choice: ConsentChoice): string {
  return JSON.stringify({ version: CONSENT_VERSION, choice, decidedAt: new Date().toISOString() });
}

function readConsent(): ConsentChoice | null {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    // Storage blocked (private mode, site data disabled): treat as undecided, so
    // analytics stays off.
    return null;
  }
}

export function saveConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(choice));
  } catch {
    // Not persisted; the choice still applies to this page view below.
  }
  sessionChoice = choice;
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

// Holds a choice made while storage is unavailable, so the banner does not come
// straight back and a refusal is still honoured until the page is reloaded.
let sessionChoice: ConsentChoice | null = null;

function subscribe(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** null until the visitor decides, and always null during server rendering. */
export function useConsent(): ConsentChoice | null {
  return useSyncExternalStore(subscribe, () => readConsent() ?? sessionChoice, () => null);
}

/** Opens the consent banner again, from a "cookie settings" link. */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onConsentSettingsOpened(listener: () => void): () => void {
  window.addEventListener(OPEN_EVENT, listener);
  return () => window.removeEventListener(OPEN_EVENT, listener);
}
