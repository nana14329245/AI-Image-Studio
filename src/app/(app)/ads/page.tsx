"use client";

import { useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { GenerationProgress, useGenerationProgress } from "@/components/GenerationProgress";
import { TOOL_CREDIT_COST } from "@/lib/plans";

const platforms = ["Facebook", "Instagram", "Shopee", "Lazada", "TikTok"];
const formats = ["1:1", "4:5", "16:9", "9:16"];
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

type AdResult = {
  result: string;
  generationId: string;
  creditsRemaining: number;
  copy: { headline: string; benefit: string; cta: string };
};

function Arrow({ down = false }: { down?: boolean }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" className={down ? "rotate-90" : ""}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>;
}

export default function AdsPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [benefits, setBenefits] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [format, setFormat] = useState("1:1");
  const [generated, setGenerated] = useState<AdResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { progress, message, track } = useGenerationProgress();
  const input = useRef<HTMLInputElement>(null);

  function chooseFile(file?: File) {
    if (!file || busy) return;
    setError("");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setImageUrl(null);
      return setError("รองรับไฟล์ JPG, PNG และ WebP เท่านั้น");
    }
    if (file.size > 4 * 1024 * 1024) {
      setImageUrl(null);
      return setError("กรุณาเลือกไฟล์ขนาดไม่เกิน 4 MB");
    }
    const reader = new FileReader();
    reader.onerror = () => setError("อ่านไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง");
    reader.onload = () => {
      setImageUrl(String(reader.result));
      setGenerated(null);
    };
    reader.readAsDataURL(file);
  }

  async function generate() {
    if (!imageUrl || busy) return;
    setBusy(true);
    setError("");
    setGenerated(null);
    try {
      const response = await fetch("/api/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, productName, benefits, platform, format }),
      });
      const data: unknown = await response.json();
      if (!response.ok || !data || typeof data !== "object" || !("generationId" in data) || typeof data.generationId !== "string") {
        const message = data && typeof data === "object" && "error" in data && typeof data.error === "string" ? data.error : "สร้างภาพโฆษณาไม่สำเร็จ กรุณาลองอีกครั้ง";
        throw new Error(message);
      }
      const completed = await track(data.generationId);
      if (!completed.copy) throw new Error("สร้างข้อความโฆษณาไม่สำเร็จ กรุณาลองใหม่");
      setGenerated({ result: completed.result, generationId: completed.generationId, creditsRemaining: completed.creditsRemaining ?? 0, copy: completed.copy });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  const aspectClass = format === "9:16" ? "aspect-[9/16]" : format === "4:5" ? "aspect-[4/5]" : format === "16:9" ? "aspect-video" : "aspect-square";

  return <>
    <PageHeader eyebrow="CAMPAIGN / CREATIVE" number="TOOL / 003" title={<>Make the product<br />the message<span className="text-accent">.</span></>} description={<>สร้างภาพโฆษณาจากรูปสินค้า พร้อม AI ช่วยคิดข้อความ Headline, Benefit และ CTA</>} />
    <div className="page-wrap">
      <div className="grid border border-ink lg:grid-cols-[380px_1fr]">
        <div className="border-b border-ink p-6 lg:border-b-0 lg:border-r">
          <p className="micro mb-5">01 / CAMPAIGN INPUT</p>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className={`dropzone min-h-40 w-full ${focus}`}>
            <span><span aria-hidden="true" className="mb-3 block text-4xl">＋</span>{imageUrl ? "เปลี่ยนรูปสินค้า" : "Upload Product"}<span className="mt-2 block font-mono text-xs text-muted">JPG, PNG, WEBP / MAX. 4 MB</span></span>
          </button>
          <label className="mt-6 block text-sm">ชื่อสินค้า<input value={productName} maxLength={120} disabled={busy} onChange={event => setProductName(event.target.value)} className={`form-field mt-2 ${focus}`} placeholder="เช่น อ่างล้างมือ Mogen" /></label>
          <label className="mt-5 block text-sm">จุดเด่น<textarea value={benefits} maxLength={500} disabled={busy} onChange={event => setBenefits(event.target.value)} className={`form-field mt-2 min-h-28 resize-y ${focus}`} placeholder={"ดีไซน์เรียบหรู\nติดตั้งง่าย\nเหมาะกับห้องน้ำสมัยใหม่"} /></label>
          <div className="mt-7 border-t border-line-soft pt-6">
            <p className="micro mb-3">02 / PLATFORM</p>
            <div className="grid grid-cols-2 gap-2">{platforms.map(item => <button key={item} type="button" disabled={busy} onClick={() => setPlatform(item)} className={`option ${platform === item ? "selected" : ""} ${focus}`}>{item}</button>)}</div>
          </div>
          <div className="mt-7 border-t border-line-soft pt-6">
            <p className="micro mb-3">03 / FORMAT</p>
            <div className="grid grid-cols-4 gap-2">{formats.map(item => <button key={item} type="button" disabled={busy} onClick={() => setFormat(item)} className={`option text-center ${format === item ? "selected" : ""} ${focus}`}>{item}</button>)}</div>
          </div>
          <button type="button" disabled={!imageUrl || busy} onClick={generate} className={`btn-primary mt-7 flex w-full items-center justify-between ${focus}`}><span>{busy ? `กำลังสร้างภาพโฆษณา ${progress}%` : "สร้างภาพโฆษณา  ↗"}</span>{busy && <span className="size-5 animate-spin rounded-full border-2 border-black/20 border-t-black" />}</button>
          <p className="mt-3 text-center font-mono text-xs text-muted">ใช้ {TOOL_CREDIT_COST.ads} เครดิตต่อครั้ง</p>
        </div>
        <div className="min-w-0 p-6">
          <div className="mb-5 flex items-center justify-between"><span className="micro">04 / GENERATED CREATIVE</span><span className="font-mono text-xs">{platform} / {format}</span></div>
          <div className="border border-line bg-surface-hover p-3">
            <div className={`grid-paper relative flex items-center justify-center ${aspectClass}`} aria-busy={busy}>
              {generated ? <img src={generated.result} alt={`Generated ${platform} advertisement for ${productName || "product"}`} className="h-full w-full object-contain" onError={() => setError("แสดงภาพผลลัพธ์ไม่ได้ กรุณาลองสร้างใหม่")} /> : <div className="text-center"><span className="block text-5xl font-light">{busy ? "…" : "＋"}</span><p className="mt-4 text-sm text-muted-soft">{busy ? "AI กำลังสร้างภาพโฆษณา…" : "ภาพโฆษณาของคุณจะแสดงที่นี่"}</p></div>}
              <span className="absolute left-3 top-3 micro">01 / CREATIVE</span>
              {busy && <div className="absolute inset-0 flex items-center justify-center bg-paper/60"><div className="border border-ink bg-paper px-6 py-5"><GenerationProgress progress={progress} message={message} /></div></div>}
            </div>
          </div>
          {generated && <div className="mt-5 border border-line bg-surface-hover p-5">
            <p className="micro mb-4">05 / AD COPY</p>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div><dt className="micro mb-1 text-muted">HEADLINE</dt><dd className="text-sm font-semibold">{generated.copy.headline}</dd></div>
              <div><dt className="micro mb-1 text-muted">BENEFIT</dt><dd className="text-sm">{generated.copy.benefit}</dd></div>
              <div><dt className="micro mb-1 text-muted">CTA</dt><dd className="text-sm font-semibold">{generated.copy.cta}</dd></div>
            </dl>
          </div>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-xs text-muted-soft">{generated ? `${generated.creditsRemaining} CREDITS REMAINING` : "READY WHEN YOU ARE"}</p>
            <div className="flex items-center gap-4">{generated && <a href={generated.result} target="_blank" rel="noopener noreferrer" className="text-sm underline">เปิดภาพ</a>}{generated && <a href={`/api/generations/${generated.generationId}/download`} download="ad-creative" className={`btn-outline flex items-center gap-3 ${focus}`}>ดาวน์โหลด<Arrow down /></a>}</div>
          </div>
        </div>
      </div>
      {error && <div role="alert" className="status-line mt-5 text-sm">{error}</div>}
    </div>
  </>;
}
