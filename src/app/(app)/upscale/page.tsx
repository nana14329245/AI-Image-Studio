"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { GenerationProgress, useGenerationProgress } from "@/components/GenerationProgress";
import { TOOL_CREDIT_COST } from "@/lib/plans";
import CompareToggle from "@/components/CompareToggle";

type Source = { url: string; name: string; width: number; height: number };
const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";
function Arrow({ down = false }: { down?: boolean }) { return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" className={down ? "rotate-90" : ""}><path d="M4 12h15m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="1.5" /></svg>; }

export default function UpscalePage() {
  const [source, setSource] = useState<Source | null>(null), [url, setUrl] = useState(""), [scale, setScale] = useState(2), [enhancement, setEnhancement] = useState<"dehaze" | "vivid">("dehaze"), [result, setResult] = useState<string | null>(null), [generationId, setGenerationId] = useState<string | null>(null), [resultScale, setResultScale] = useState(2), [view, setView] = useState<"original" | "result">("original"), [busy, setBusy] = useState(false), [loading, setLoading] = useState(false), [dragging, setDragging] = useState(false), [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null); const selection = useRef(0); const router = useRouter();
  const { progress, message, track } = useGenerationProgress("upscale");

  async function loadImage(imageUrl: string, name: string) {
    const ticket = ++selection.current; setLoading(true); setError(""); setResult(null); setGenerationId(null); setSource(null); setView("original");
    try { const img = new window.Image(); await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("เปิดภาพไม่ได้ กรุณาเลือกไฟล์ใหม่หรือใช้ลิงก์ภาพโดยตรง")); img.src = imageUrl; }); if (ticket !== selection.current) return; if (img.naturalWidth * img.naturalHeight > 16_000_000) throw new Error("กรุณาใช้ภาพขนาดไม่เกิน 16 ล้านพิกเซล"); setSource({ url: imageUrl, name, width: img.naturalWidth, height: img.naturalHeight }); }
    catch (e) { if (ticket === selection.current) setError(e instanceof Error ? e.message : "เปิดภาพไม่ได้"); } finally { if (ticket === selection.current) setLoading(false); }
  }
  function chooseFile(file?: File) { if (!file || busy || loading) return; setError(""); if (!["image/jpeg","image/png","image/webp"].includes(file.type)) return setError("รองรับไฟล์ JPG, PNG และ WebP เท่านั้น"); if (file.size > 4 * 1024 * 1024) return setError("กรุณาเลือกไฟล์ขนาดไม่เกิน 4 MB"); const reader = new FileReader(); reader.onerror = () => setError("อ่านไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง"); reader.onload = () => void loadImage(String(reader.result), file.name); reader.readAsDataURL(file); }
  async function upscale() { if (!source || busy) return; setBusy(true); setError(""); setResult(null); setGenerationId(null); setView("original"); try { const response = await fetch("/api/upscale", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ imageUrl:source.url, scale, enhancement }) }); const data: { generationId?: unknown; error?: unknown } = await response.json(); if (!response.ok || typeof data.generationId !== "string") throw new Error(typeof data.error === "string" ? data.error : "ขยายภาพไม่สำเร็จ กรุณาลองอีกครั้ง"); const completed = await track(data.generationId); setResult(completed.result); setGenerationId(completed.generationId); setResultScale(scale); setView("result"); router.refresh(); } catch(e) { setError(e instanceof Error ? e.message : "เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง"); } finally { setBusy(false); } }

  return <>
    <PageHeader eyebrow="ENHANCE / RESOLUTION" number="TOOL / 001" title={<>Small image.<br />Bigger possibilities<span className="text-accent">.</span></>} description={<>เพิ่มความละเอียดด้วย AI เลือก 2× หรือ 4× แล้วดูผลลัพธ์ใน workspace เดียว</>} />
    <div className="page-wrap">
      <section className="grid border border-ink lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="border-b border-ink p-6 lg:border-b-0 lg:border-r">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-medium">เลือกภาพต้นฉบับ</h2><span className="micro">01 / INPUT</span></div>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{chooseFile(e.target.files?.[0]);e.target.value="";}} />
          <button type="button" disabled={busy||loading} onClick={()=>input.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true)}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);chooseFile(e.dataTransfer.files[0])}} className={`dropzone w-full p-5 ${dragging?"dragging":""} ${focus}`}><span><span aria-hidden="true" className="mb-4 block text-4xl font-light">＋</span><span className="block">{loading?"กำลังอ่านภาพ…":"ลากภาพมาวาง หรือเลือกไฟล์"}</span><span className="mt-2 block font-mono text-xs text-muted">JPG, PNG, WEBP / MAX. 4 MB</span></span></button>
          <form className="mt-5" onSubmit={e=>{e.preventDefault();try{const parsed=new URL(url);if(parsed.protocol!=="https:")throw new Error();void loadImage(parsed.href,"ภาพจาก URL")}catch{setError("กรุณาใช้ลิงก์ภาพที่ขึ้นต้นด้วย https://")}}}><label htmlFor="image-url" className="mb-2 block text-sm text-muted-soft">หรือใช้ลิงก์ภาพ</label><div className="flex border border-line"><input id="image-url" type="url" disabled={busy||loading} placeholder="https://example.com/image.jpg" value={url} onChange={e=>setUrl(e.target.value)} className={`min-w-0 flex-1 bg-transparent px-3 py-3 text-sm ${focus}`} /><button type="submit" disabled={busy||loading||!url} className={`border-l border-line px-3 ${focus}`}><Arrow/></button></div></form>
          <div className="mt-7 border-t border-line-soft pt-6"><div className="mb-4 flex items-center justify-between"><h2 className="font-medium">อัตราขยาย</h2><span className="micro">02 / SCALE</span></div><div className="grid grid-cols-2 gap-3">{[2,4].map(n=><button key={n} type="button" disabled={busy} onClick={()=>setScale(n)} className={`flex items-end justify-between border p-4 ${scale===n?"border-ink bg-ink text-white":"border-line hover:bg-white"} ${focus}`}><span className="text-4xl font-medium">{n}×</span><span className="font-mono text-xs">{n*100}%</span></button>)}</div><dl className="my-5 flex justify-between text-sm"><dt className="text-muted-soft">ขนาดเป้าหมาย</dt><dd className="font-mono">{source?`${source.width*scale} × ${source.height*scale} px`:"— × — px"}</dd></dl>
          <div className="mb-5 border-t border-line-soft pt-4">
            <div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-medium">โหมดภาพ</h3><span className="micro">03 / STYLE</span></div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => setEnhancement("dehaze")} className={`option text-left text-xs ${enhancement === "dehaze" ? "selected" : ""} ${focus}`}>
                <span className="block font-medium">Vivid Dehaze</span>
                <span className="mt-0.5 block text-[10px] text-muted">ลบหมอก สีสด คมชัด</span>
              </button>
              <button type="button" disabled={busy} onClick={() => setEnhancement("vivid")} className={`option text-left text-xs ${enhancement === "vivid" ? "selected" : ""} ${focus}`}>
                <span className="block font-medium">Vivid & Sharp</span>
                <span className="mt-0.5 block text-[10px] text-muted">คมชัด สีมาตรฐาน</span>
              </button>
            </div>
          </div>
          <button disabled={!source||busy||loading} onClick={upscale} className={`btn-primary flex w-full items-center justify-between ${focus}`}><span>{busy?`กำลังขยายภาพ ${progress}%`:"ขยายภาพ"}</span>{busy?<span className="size-5 animate-spin rounded-full border-2 border-black/20 border-t-black"/>:<Arrow/>}</button>
          <p className="mt-3 text-center font-mono text-xs text-muted">ใช้ {TOOL_CREDIT_COST.upscale} เครดิตต่อครั้ง</p>
          <p className="mt-3 text-xs leading-5 text-muted-soft">เมื่อเริ่มขยาย ภาพจะถูกส่งไปประมวลผลที่ fal.ai</p>
        </div>
        </div>
        <div className="flex min-w-0 flex-col p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="micro">03 / PREVIEW</h2><CompareToggle view={view} onChange={setView} resultReady={!!result} /></div>
          <div className="preview-card grid-paper flex flex-1 items-center justify-center p-5" aria-busy={busy}>{source?<img src={view==="result"&&result?result:source.url} alt={view==="result"?"ภาพหลังขยายด้วย AI":"ภาพต้นฉบับ"} className={`max-h-[520px] max-w-full object-contain ${busy?"opacity-40":""}`} onError={()=>setError("แสดงภาพไม่ได้ กรุณาตรวจสอบลิงก์หรือเลือกภาพใหม่")}/>:<div className="py-10 text-center"><div className="mx-auto mb-8 flex size-28 items-center justify-center border border-muted-soft bg-paper text-6xl font-light text-muted-soft">＋</div><p className="text-xl font-medium">A little bigger. A lot clearer.</p><p className="mt-3 text-sm text-muted-soft">เลือกภาพเพื่อเริ่มต้น</p></div>}{busy&&<div className="absolute inset-0 flex items-center justify-center bg-paper/60"><div className="border border-ink bg-paper px-6 py-5"><GenerationProgress progress={progress} message={message}/></div></div>}</div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><div className="min-w-0"><p className="max-w-[320px] truncate text-sm">{source?.name||"ยังไม่ได้เลือกภาพ"}</p><p className="mt-1 font-mono text-xs text-muted-soft">{source?`${source.width} × ${source.height} px${result?` → ${source.width*resultScale} × ${source.height*resultScale} px`:""}`:"READY WHEN YOU ARE"}</p></div><div className="flex items-center gap-4">{result&&<a href={result} target="_blank" rel="noopener noreferrer" className="text-sm underline">เปิดภาพ</a>}{generationId&&<a href={`/api/generations/${generationId}/download`} download={`upscaled-${resultScale}x`} className={`btn-outline flex items-center gap-3 ${focus}`}>ดาวน์โหลด<Arrow down/></a>}</div></div>
        </div>
      </section>
      {error&&<div role="alert" className="status-line mt-5 text-sm">{error}</div>}
    </div>
  </>;
}
