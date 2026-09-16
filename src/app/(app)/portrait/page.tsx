"use client";

import { useRef, useState } from "react";
import PageHeader from "@/components/PageHeader";
import { GenerationProgress, useGenerationProgress } from "@/components/GenerationProgress";
import { TOOL_CREDIT_COST } from "@/lib/plans";

const careers = ["Office", "IT", "Banking", "Hotel", "Sales", "Student"];
const backgrounds = ["White", "Gray", "Blue", "Office"];
const sizes = ["Resume", "1 × 1", "Passport"];
const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 4 * 1024 * 1024;

function readAsDataUri(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read the selected image."));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
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
  const { progress, message, track } = useGenerationProgress();
  const input = useRef<HTMLInputElement>(null);

  const selectFile = async (selectedFile?: File) => {
    setError(null);
    setResult(null);
    setGenerationId(null);
    setCreditsRemaining(null);

    if (!selectedFile) return;
    if (!acceptedTypes.includes(selectedFile.type)) {
      setImageUrl(null);
      setError("Please select a JPG, PNG, or WebP image.");
      return;
    }
    if (selectedFile.size > maxFileSize) {
      setImageUrl(null);
      setError("Image must be 4MB or smaller.");
      return;
    }

    try {
      setImageUrl(await readAsDataUri(selectedFile));
    } catch (readError) {
      setImageUrl(null);
      setError(readError instanceof Error ? readError.message : "Could not read the selected image.");
    }
  };

  const generatePortrait = async () => {
    if (!imageUrl || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setGenerationId(null);
    setCreditsRemaining(null);

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
        throw new Error(data.error || "Could not create your professional portrait.");
      }

      const completed = await track(data.generationId);
      setResult(completed.result);
      setGenerationId(completed.generationId);
      setCreditsRemaining(completed.creditsRemaining ?? null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create your professional portrait.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

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
                <span className="block">{imageUrl ? "เปลี่ยนรูปโปรไฟล์" : "Upload your photo"}</span>
                <span className="mt-2 block text-xs text-muted">JPG, PNG, or WebP · max 4MB</span>
              </span>
            </button>
            {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-8 grid gap-8 md:grid-cols-3">
              <div>
                <p className="micro mb-3">02 / CAREER</p>
                <div className="grid gap-2">{careers.map((option) => <button type="button" key={option} onClick={() => setCareer(option)} className={`option ${career === option ? "selected" : ""}`}>{option}</button>)}</div>
              </div>
              <div>
                <p className="micro mb-3">03 / BACKGROUND</p>
                <div className="grid gap-2">{backgrounds.map((option) => <button type="button" key={option} onClick={() => setBackground(option)} className={`option ${background === option ? "selected" : ""}`}>{option}</button>)}</div>
              </div>
              <div>
                <p className="micro mb-3">04 / SIZE</p>
                <div className="grid gap-2">{sizes.map((option) => <button type="button" key={option} onClick={() => setSize(option)} className={`option ${size === option ? "selected" : ""}`}>{option}</button>)}</div>
              </div>
            </div>
            <button type="button" disabled={!imageUrl || isGenerating} onClick={() => void generatePortrait()} className="btn-primary mt-8 w-full disabled:cursor-not-allowed disabled:opacity-50">
              {isGenerating ? `กำลังสร้างภาพ ${progress}%` : "สร้างภาพโปรไฟล์  ↗"}
            </button>
            <p className="mt-3 text-center font-mono text-xs text-muted">ใช้ {TOOL_CREDIT_COST.portrait} เครดิตต่อครั้ง</p>
            {creditsRemaining !== null && <p className="mt-3 text-center font-mono text-xs text-muted">CREDITS REMAINING: {creditsRemaining}</p>}
          </div>
          <div className="p-6">
            <div className="mb-5 flex justify-between">
              <span className="micro">05 / RESULT</span>
              <span className="font-mono text-xs">{career} / {background} / {size}</span>
            </div>
            <div className="preview-card flex min-h-[560px] items-center justify-center p-8 bg-surface-alt">
              {result ? (
                <div className="w-full">
                  <div className="relative mx-auto flex max-h-[500px] max-w-[350px] items-center justify-center overflow-hidden bg-white">
                    <img src={result} alt="Generated professional portrait" className="max-h-[500px] max-w-full object-contain" />
                    <span className="absolute bottom-3 left-3 border border-ink bg-paper px-3 py-2 micro">{background} / {career}</span>
                  </div>
                  <div className="mx-auto mt-5 flex max-w-[350px] gap-3">
                    <a href={result} target="_blank" rel="noopener noreferrer" className="option flex-1 text-center">OPEN ↗</a>
                    {generationId && <a href={`/api/generations/${generationId}/download`} download="professional-portrait" className="option flex-1 text-center">DOWNLOAD ↓</a>}
                  </div>
                </div>
              ) : isGenerating ? (
                <GenerationProgress progress={progress} message={message} />
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-6 flex size-32 items-center justify-center border border-muted-soft bg-paper text-6xl font-light">◎</div>
                  <p className="text-lg font-medium">Professional, not artificial.</p>
                  <p className="mt-3 text-sm leading-6 text-muted">Upload a clear photo, choose your preferences, and create your AI portrait.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
