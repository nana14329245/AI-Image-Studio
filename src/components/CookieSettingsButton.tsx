"use client";

import { isAnalyticsEnabled } from "@/lib/analytics";
import { openConsentSettings } from "@/lib/consent";

/** Lets a visitor change their analytics choice at any time, as the PDPA requires. */
export default function CookieSettingsButton({ className = "" }: { className?: string }) {
  if (!isAnalyticsEnabled()) return null;
  return (
    <button type="button" onClick={openConsentSettings} className={`underline-offset-4 hover:underline control-focus ${className}`}>
      ตั้งค่าคุกกี้
    </button>
  );
}
