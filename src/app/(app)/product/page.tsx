"use client";

import { useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { GenerationProgress, useGenerationProgress } from "@/components/GenerationProgress";
import { TOOL_CREDIT_COST } from "@/lib/plans";
import { PRODUCT_BACKGROUNDS, PRODUCT_STYLES } from "@/lib/toolOptions";
import CompareToggle, { type CompareView } from "@/components/CompareToggle";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const supportedTypes = ["image/jpeg", "image/png", "image/webp"];

const ANGLE_PRESETS = [
  { id: 0, tag: "01 / FRONT", label: "มุมตรงด้านหน้า (Eye-Level)", desc: "ภาพหน้าร้าน ชัดเจน ครบถ้วน" },
  { id: 1, tag: "02 / 45° ANGLE", label: "มุมเฉียง 45° (Perspective)", desc: "มิติความลึก โชว์ดีเทลด้านข้าง" },
  { id: 2, tag: "03 / FLATLAY", label: "มุมท็อป (Top-Down Flatlay)", desc: "จัดวางบนพื้น สไตล์นิตยสาร" },
  { id: 3, tag: "04 / LIFESTYLE", label: "มุมจัดฉาก (In-Context)", desc: "บรรยากาศการใช้งานจริง" },
];

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

export default function ProductPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [style, setStyle] = useState("Clean");
  const [bg, setBg] = useState("Studio");
  const [result, setResult] = useState<string | null>(null);
  const [results, setResults] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<CompareView>("original");
  const { progress, message, track } = useGenerationProgress("product");
  const input = useRef<HTMLInputElement>(null);

  async function selectFile(file?: File) {
    setError(null);
    setResult(null);
    setResults([]);
    setSelectedIndex(0);
    setGenerationId(null);
    setView("original");
    if (!file) return;
    if (!supportedTypes.includes(file.type)) return setError("กรุณาเลือกไฟล์ JPG, PNG หรือ WebP");
    if (file.size > MAX_FILE_SIZE) return setError("ไฟล์ต้องมีขนาดไม่เกิน 4 MB");
    try {
      setImageUrl(await readAsDataUrl(file));
    } catch (cause) {
      setImageUrl(null);
      setError(cause instanceof Error ? cause.message : "อ่านไฟล์ไม่สำเร็จ");
    }
  }

  async function generate() {
    if (!imageUrl || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setResults([]);
    setSelectedIndex(0);
    setGenerationId(null);
    setView("original");
    try {
      const response = await fetch("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, style, background: bg }),
      });
      const data: { generationId?: string; error?: string } = await response.json();
      if (!response.ok || !data.generationId) throw new Error(data.error || "สร้างภาพสินค้าไม่สำเร็จ");
      const completed = await track(data.generationId);
      const outputList = Array.isArray(completed.results) && completed.results.length > 0
        ? completed.results
        : (completed.result ? [completed.result] : []);
      setResults(outputList);
      setResult(outputList[0] || completed.result);
      setSelectedIndex(0);
      setGenerationId(completed.generationId);
      setView("result");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "สร้างภาพสินค้าไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  const activeImage = results[selectedIndex] || result;
  const previewImage = view === "result" ? activeImage : imageUrl;
  const styleLabel = PRODUCT_STYLES.find(o => o.value === style)?.label ?? style;
  const bgLabel = PRODUCT_BACKGROUNDS.find(o => o.value === bg)?.label ?? bg;

  return (
    <>
      <PageHeader
        eyebrow="COMMERCE / PRODUCT"
        number="TOOL / 002"
        title={
          <>
            From ordinary.
            <br />
            To ready-to-sell<span className="text-accent">.</span>
          </>
        }
        description={<>สร้างภาพสินค้า 4 มุมมองสำหรับ Shopee, Lazada และ TikTok จากรูปต้นฉบับเพียงภาพเดียว</>}
      />
      <div className="page-wrap">
        <div className="grid gap-0 border border-ink lg:grid-cols-[1.05fr_.95fr]">
          {/* Left Column: Form & Inputs */}
          <div className="border-b border-ink p-6 lg:border-b-0 lg:border-r">
            <div className="mb-5 flex justify-between">
              <span className="micro">01 / PRODUCT INPUT</span>
              <span className="font-mono text-xs">JPG / PNG / WEBP</span>
            </div>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={event => void selectFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={loading}
              className="dropzone w-full p-5 disabled:opacity-40"
            >
              <span>
                <span className="mb-4 block text-4xl">＋</span>
                <span className="block">{imageUrl ? "เปลี่ยนรูปสินค้า" : "อัปโหลดรูปสินค้า"}</span>
                <span className="mt-2 block text-xs text-muted">รูปเดียวสร้างได้ครบ 4 มุมมอง · สูงสุด 4 MB</span>
              </span>
            </button>
            {error && <p role="alert" className="mt-3 text-sm text-accent">{error}</p>}
            {imageUrl && (
              <div className="mt-4 flex items-center gap-3 border border-line-soft p-3">
                <img src={imageUrl} className="size-14 object-cover" alt="Selected product" />
                <div>
                  <p className="text-sm">พร้อมสร้างภาพแล้ว</p>
                  <p className="micro mt-1 text-muted">4 ANGLES GENERATION → SHARP → COLOR BOOST</p>
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-line-soft pt-6">
              <div className="mb-4 flex justify-between">
                <span className="micro">02 / STYLE</span>
                <span className="text-xs text-muted">เลือก 1 แบบ</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_STYLES.map(option => (
                  <button
                    type="button"
                    key={option.value}
                    disabled={loading}
                    aria-pressed={style === option.value}
                    onClick={() => setStyle(option.value)}
                    className={`option ${style === option.value ? "selected" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 border-t border-line-soft pt-6">
              <div className="mb-4 flex justify-between">
                <span className="micro">03 / BACKGROUND</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRODUCT_BACKGROUNDS.map(option => (
                  <button
                    type="button"
                    key={option.value}
                    disabled={loading}
                    aria-pressed={bg === option.value}
                    onClick={() => setBg(option.value)}
                    className={`option ${bg === option.value ? "selected" : ""}`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              disabled={!imageUrl || loading}
              onClick={generate}
              className="btn-primary mt-8 w-full disabled:opacity-40"
            >
              {loading ? `กำลังสร้าง 4 มุมมอง ${progress}%` : "สร้างภาพสินค้า 4 มุมมอง  ↗"}
            </button>
            <p className="mt-3 text-center font-mono text-xs text-muted">ใช้ {TOOL_CREDIT_COST.product} เครดิตต่อครั้ง</p>
          </div>

          {/* Right Column: Dynamic Preview & 4-Angle Selector */}
          <div className="flex flex-col p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="micro">04 / COMPOSITION PREVIEW</span>
              {imageUrl ? (
                <CompareToggle view={view} onChange={setView} resultReady={!!activeImage} />
              ) : (
                <span className="micro text-muted">{styleLabel + " / " + bgLabel}</span>
              )}
            </div>

            {/* Main Stage Preview */}
            <div className="preview-card grid-paper relative flex min-h-[460px] flex-1 items-center justify-center p-6">
              {previewImage ? (
                <div className="flex flex-col items-center justify-center">
                  <div className="relative max-w-sm">
                    <img
                      src={previewImage}
                      alt={view === "result" ? `ภาพที่สร้าง — ${ANGLE_PRESETS[selectedIndex]?.label || "มุมมอง"}` : "ภาพต้นฉบับที่อัปโหลด"}
                      className="max-h-[420px] w-full object-contain drop-shadow-2xl"
                    />
                    {view === "original" && (
                      <span className="absolute left-2 top-2 border border-ink bg-paper px-2 py-1 micro">ต้นฉบับ</span>
                    )}
                  </div>

                  {view === "result" && activeImage && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <a
                      href={activeImage}
                      target="_blank"
                      rel="noreferrer"
                      className="border border-ink bg-paper px-3 py-2 font-mono text-[11px] uppercase tracking-wider hover:bg-surface-hover"
                    >
                      เปิดภาพเต็ม ↗
                    </a>
                    {generationId && (
                      <a
                        href={`/api/generations/${generationId}/download?index=${selectedIndex}`}
                        download={`product-angle-${selectedIndex + 1}.png`}
                        className="btn-primary px-3 py-2 font-mono text-[11px] uppercase tracking-wider"
                      >
                        ดาวน์โหลดมุมนี้ ↓
                      </a>
                    )}
                  </div>}
                </div>
              ) : loading ? (
                <GenerationProgress progress={progress} message={message} />
              ) : (
                <div className="max-w-xs text-center">
                  <div className="mb-6 text-6xl font-light">□</div>
                  <p className="text-lg font-medium">ได้ภาพครบ 4 มุม พร้อมลงขาย</p>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    อัปโหลดรูปสินค้าแล้ว AI จะสร้างรูปใน 4 มุมมองที่แตกต่างกันเพื่อให้คุณเลือกใช้ได้ทันที
                  </p>
                </div>
              )}
            </div>

            {/* 5-Angle Variations Carousel / Thumbnail Selector */}
            {results.length > 0 && (
              <div className="mt-6 border-t border-ink pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="micro">SELECT ANGLE VARIATION</span>
                  <span className="font-mono text-[11px] text-muted">CLICK TO VIEW & DOWNLOAD</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {results.map((itemUrl, idx) => {
                    const preset = ANGLE_PRESETS[idx] || { tag: `0${idx + 1}`, label: `มุมที่ ${idx + 1}` };
                    const isSelected = selectedIndex === idx;

                    return (
                      <button
                        key={itemUrl + idx}
                        type="button"
                        onClick={() => setSelectedIndex(idx)}
                        className={`group relative flex flex-col items-center border p-1.5 transition-all ${
                          isSelected
                            ? "border-2 border-accent bg-surface-alt shadow-sm"
                            : "border-line bg-paper hover:border-ink hover:bg-surface-hover"
                        }`}
                      >
                        <div className="aspect-square w-full overflow-hidden bg-surface-hover">
                          <img
                            src={itemUrl}
                            alt={preset.label}
                            className="size-full object-cover transition-transform group-hover:scale-105"
                          />
                        </div>
                        <span
                          className={`mt-1.5 block w-full truncate text-center font-mono text-[9px] font-bold ${
                            isSelected ? "text-accent" : "text-muted"
                          }`}
                        >
                          {preset.tag}
                        </span>
                        <span className="mt-0.5 hidden w-full truncate text-center text-[10px] md:block text-muted-soft">
                          {preset.label.split(" ")[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="mt-6 grid gap-4 border-t border-ink pt-6 md:grid-cols-4">
          {ANGLE_PRESETS.map((item) => (
            <div key={item.id} className="border-t border-ink pt-3">
              <span className="micro">{item.tag}</span>
              <p className="mt-1 text-xs font-semibold">{item.label}</p>
              <p className="mt-0.5 text-[11px] text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

