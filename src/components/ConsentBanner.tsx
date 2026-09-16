"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { isAnalyticsEnabled } from "@/lib/analytics";
import { onConsentSettingsOpened, saveConsent, useConsent, type ConsentChoice } from "@/lib/consent";

/**
 * Asks before loading analytics. Accept and refuse are the same size and weight:
 * under the PDPA, refusing must be as easy as agreeing. Not shown at all when no
 * analytics key is configured, because then nothing optional is collected.
 */
const noSubscription = () => () => {};

export default function ConsentBanner() {
  const consent = useConsent();
  // The choice lives in localStorage, which the server cannot read. Rendering
  // nothing until hydrated keeps the banner from flashing for returning visitors.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const [reopened, setReopened] = useState(false);

  useEffect(() => onConsentSettingsOpened(() => setReopened(true)), []);

  if (!hydrated || !isAnalyticsEnabled() || (consent !== null && !reopened)) return null;

  function choose(choice: ConsentChoice) {
    saveConsent(choice);
    setReopened(false);
  }

  return (
    <section
      role="region"
      aria-label="ความยินยอมการเก็บข้อมูลการใช้งาน"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-ink bg-paper px-4 py-4 sm:px-8"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm leading-6">
          เราขอเก็บสถิติการใช้งานแบบไม่ระบุเนื้อหา (หน้าที่เปิดและขั้นตอนที่ใช้) เพื่อปรับปรุงเว็บไซต์
          ไม่เก็บข้อความที่คุณพิมพ์หรือภาพที่อัปโหลด คุกกี้ที่จำเป็นต่อการเข้าสู่ระบบใช้งานเสมอ{" "}
          <Link href="/privacy#cookies" className="underline underline-offset-4 control-focus">
            อ่านนโยบายความเป็นส่วนตัว
          </Link>
          {consent && <span className="text-muted"> · ตอนนี้: {consent === "granted" ? "ยอมรับแล้ว" : "ปฏิเสธแล้ว"}</span>}
        </p>
        <div className="grid shrink-0 grid-cols-2 gap-3">
          <button type="button" onClick={() => choose("denied")} className="btn-outline px-6 text-sm control-focus">
            ปฏิเสธ
          </button>
          <button type="button" onClick={() => choose("granted")} className="btn-outline px-6 text-sm control-focus">
            ยอมรับ
          </button>
        </div>
      </div>
    </section>
  );
}
