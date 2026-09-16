"use client";

import { useCallback, useState } from "react";
import { track as trackEvent } from "@/lib/analytics";

type StatusResponse = {
  status?: "queued" | "generating" | "saving" | "completed" | "failed" | "processing";
  progress?: number;
  message?: string;
  queuePosition?: number;
  result?: string;
  results?: string[];
  generationId?: string;
  creditsRemaining?: number;
  error?: string;
  copy?: { headline: string; benefit: string; cta: string };
};

const wait = (milliseconds: number) => new Promise(resolve => setTimeout(resolve, milliseconds));

export function useGenerationProgress(tool: "upscale" | "product" | "ads" | "portrait") {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const track = useCallback(async (generationId: string) => {
    setProgress(5);
    setMessage("กำลังส่งงานเข้าคิว");
    trackEvent("generation_started", { tool });
    for (let attempt = 0; attempt < 600; attempt += 1) {
      await wait(1_000);
      const response = await fetch(`/api/generations/${generationId}/status`, { cache: "no-store" });
      const data = await response.json() as StatusResponse;
      if (!response.ok || data.status === "failed") {
        trackEvent("generation_failed", { tool });
        throw new Error(data.error || "สร้างภาพไม่สำเร็จ กรุณาลองใหม่");
      }
      setProgress(data.progress ?? 5);
      setMessage(data.queuePosition ? `กำลังรอคิวสร้างภาพ (คิวที่ ${data.queuePosition})` : data.message || "กำลังสร้างภาพ");
      if (data.status === "completed" && data.result && data.generationId) {
        trackEvent("generation_completed", { tool });
        return data as Required<Pick<StatusResponse, "result" | "generationId">> & StatusResponse;
      }
    }
    trackEvent("generation_failed", { tool, reason: "timeout" });
    throw new Error("งานยังไม่เสร็จภายในเวลาที่กำหนด กรุณาตรวจสอบผลลัพธ์ใน Gallery แล้วลองใหม่");
  }, [tool]);

  return { progress, message, track };
}

export function GenerationProgress({ progress, message }: { progress: number; message: string }) {
  return <div className="w-full max-w-xs text-center" role="status" aria-live="polite">
    <p className="font-mono text-4xl font-medium">{progress}%</p>
    <div className="mt-4 h-2 overflow-hidden border border-ink bg-paper">
      <div className="h-full bg-accent transition-[width] duration-500 ease-out" style={{ width: `${progress}%` }} />
    </div>
    <p className="mt-4 text-sm leading-6 text-muted">{message}</p>
  </div>;
}
