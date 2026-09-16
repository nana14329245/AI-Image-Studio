"use client";

import { useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { GenerationProgress, useGenerationProgress } from "@/components/GenerationProgress";
import { TOOL_CREDIT_COST } from "@/lib/plans";
import { PORTRAIT_BACKGROUNDS, PORTRAIT_CAREERS, PORTRAIT_SIZES } from "@/lib/toolOptions";
import CompareToggle, { type CompareView } from "@/components/CompareToggle";

const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 4 * 1024 * 1024;

function readAsDataUri(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

export default function PortraitPage() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [career, setCareer] = useState("Office");
  const [background, setBackground] = useState("White");
  const [size, setSize] = useState("Resume");
  const [result, setResult] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [view, setView] = useState<CompareView>("original");
  const { progress, message, track } = useGenerationProgress();
  const input = useRef<HTMLInputElement>(null);

  const selectFile = async (selectedFile?: File) => {
    setError(null);
    setResult(null);
    setGenerationId(null);
    setCreditsRemaining(null);
    setView("original");

    if (!selectedFile) return;
    if (!acceptedTypes.includes(selectedFile.type)) {
      setImageUrl(null);
      setError("กรุณาเลือกไฟล์ JPG, PNG หรือ WebP");
      return;
    }
    if (selectedFile.size > maxFileSize) {
      setImageUrl(null);
      setError("ไฟล์ต้องมีขนาดไม่เกิน 4 MB");
      return;
    }

    try {
      setImageUrl(await readAsDataUri(selectedFile));
    } catch (readError) {
      setImageUrl(null);
      setError(readError instanceof Error ? readError.message : "อ่านไฟล์ไม่สำเร็จ");
    }
  };

  const generatePortrait = async () => {
    if (!imageUrl || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setGenerationId(null);
    setCreditsRemaining(null);
    setView("original");

    try {
      const response = await fetch("/api/portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, career, background, size }),
      });
      const data = (await response.json()) as {
        generationId?: string;
        error?: string;
      };

      if (!response.ok || !data.generationId) {
        throw new Error(data.error || "สร้างภาพโปรไฟล์ไม่สำเร็จ");
      }

      const completed = await track(data.generationId);
      setResult(completed.result);
      setGenerationId(completed.generationId);
      setCreditsRemaining(completed.creditsRemaining ?? null);
      setView("result");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "สร้างภาพโปรไฟล์ไม่สำเร็จ",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const previewImage = view === "result" ? result : imageUrl;
  const careerLabel = PORTRAIT_CAREERS.find(o => o.value === career)?.label ?? career;
  const backgroundLabel = PORTRAIT_BACKGROUNDS.find(o => o.value === background)?.label ?? background;

  return (
    <>
      <PageHeader
        eyebrow="PROFILE / CAREER"
        number="TOOL / 004"
        title={<>A better first<br />impression<span className="text-accent">.</span></>}
        description={<>ปรับภาพโปรไฟล์ให้สุภาพและเหมาะกับบริบทการสมัครงาน พร้อมเลือกพื้นหลังและสัดส่วน</>}
      />
      <div className="page-wrap">
        <div className="grid border border-ink lg:grid-cols-[1fr_390px]">
          <div className="p-6 lg:border-r border-ink">
            <div className="mb-5 flex justify-between">
              <span className="micro">01 / PHOTO INPUT</span>
              <span className="micro">PORTRAIT MODE</span>
            </div>
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={(event) => {
                void selectFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button type="button" onClick={() => input.current?.click()} className="dropzone w-full min-h-64">
              <span>
                <span className="mb-4 block text-5xl">◎</span>
                <span className="block">{imageUrl ? "เปลี่ยนรูปโปรไฟล์" : "อัปโหลดรูปของคุณ"}</span>
                <span className="mt-2 block text-xs text-muted">JPG, PNG หรือ WebP · สูงสุด 4 MB</span>
              </span>
            </button>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              <div>
                <p className="micro mb-3">02 / CAREER</p>
                <div className="grid gap-2">{PORTRAIT_CAREERS.map((option) => <button type="button" key={option.value} aria-pressed={career === option.value} onClick={() => setCareer(option.value)} className={`option ${career === option.value ? "selected" : ""}`}>{option.label}</button>)}</div>
              </div>
              <div>
                <p className="micro mb-3">03 / BACKGROUND</p>
                <div className="grid gap-2">{PORTRAIT_BACKGROUNDS.map((option) => <button type="button" key={option.value} aria-pressed={background === option.value} onClick={() => setBackground(option.value)} className={`option ${background === option.value ? "selected" : ""}`}>{option.label}</button>)}</div>
              </div>
              <div>
                <p className="micro mb-3">04 / SIZE</p>
                <div className="grid gap-2">{PORTRAIT_SIZES.map((option) => <button type="button" key={option.value} aria-pressed={size === option.value} onClick={() => setSize(option.value)} className={`option ${size === option.value ? "selected" : ""}`}>{option.label}</button>)}</div>
              </div>
            </div>
            <button type="button" disabled={!imageUrl || isGenerating} onClick={() => void generatePortrait()} className="btn-primary mt-8 w-full disabled:cursor-not-allowed disabled:opacity-50">
              {isGenerating ? `กำลังสร้างภาพ ${progress}%` : "สร้างภาพโปรไฟล์  ↗"}
            </button>
            <p className="mt-3 text-center font-mono text-xs text-muted">ใช้ {TOOL_CREDIT_COST.portrait} เครดิตต่อครั้ง</p>
            {creditsRemaining !== null && <p className="mt-3 text-center font-mono text-xs text-muted">เครดิตคงเหลือ {creditsRemaining}</p>}
          </div>
          <div className="p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <span className="micro">05 / RESULT</span>
              {imageUrl ? (
                <CompareToggle view={view} onChange={setView} resultReady={!!result} />
              ) : (
                <span className="font-mono text-xs">{careerLabel} / {backgroundLabel}</span>
              )}
            </div>
            <div className="preview-card flex min-h-[560px] items-center justify-center p-8 bg-surface-alt">
              {previewImage ? (
                <div className="w-full">
                  <div className="relative mx-auto flex max-h-[500px] max-w-[350px] items-center justify-center overflow-hidden bg-surface-alt">
                    <img src={previewImage} alt={view === "result" ? "ภาพโปรไฟล์ที่สร้างขึ้น" : "ภาพต้นฉบับที่อัปโหลด"} className="max-h-[500px] max-w-full object-contain" />
                    <span className="absolute bottom-3 left-3 border border-ink bg-paper px-3 py-2 micro">{view === "result" ? `${backgroundLabel} / ${careerLabel}` : "ต้นฉบับ"}</span>
                  </div>
                  {view === "result" && result && (
                    <div className="mx-auto mt-5 flex max-w-[350px] gap-3">
                      <a href={result} target="_blank" rel="noopener noreferrer" className="option flex-1 text-center">เปิดภาพ ↗</a>
                      {generationId && <a href={`/api/generations/${generationId}/download`} download="professional-portrait" className="option flex-1 text-center">ดาวน์โหลด ↓</a>}
                    </div>
                  )}
                </div>
              ) : isGenerating ? (
                <GenerationProgress progress={progress} message={message} />
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-6 flex size-32 items-center justify-center border border-muted-soft bg-paper text-6xl font-light">◎</div>
                  <p className="text-lg font-medium">ดูเป็นมืออาชีพ แต่ยังเป็นคุณ</p>
                  <p className="mt-3 text-sm leading-6 text-muted">อัปโหลดรูปที่เห็นหน้าชัด เลือกประเภทงานและพื้นหลัง แล้วให้ AI จัดภาพให้</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
