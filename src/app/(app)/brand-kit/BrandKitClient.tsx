"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";

const focus = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40";

export default function BrandKitClient({ initialLogoUrl, initialPrimaryColor, initialSecondaryColor }: { initialLogoUrl: string | null; initialPrimaryColor: string | null; initialSecondaryColor: string | null }) {
  const [logoUrl, setLogoUrl] = useState(initialLogoUrl);
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(initialPrimaryColor);
  const [primaryTouched, setPrimaryTouched] = useState(false);
  const [secondaryColor, setSecondaryColor] = useState(initialSecondaryColor);
  const [secondaryTouched, setSecondaryTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const previewLogo = pendingLogo ?? (removeLogo ? null : logoUrl);
  const dirty = primaryTouched || secondaryTouched || !!pendingLogo || removeLogo;

  function chooseFile(file?: File) { if (!file || saving) return; setError(""); if (!["image/png", "image/webp"].includes(file.type)) return setError("โลโก้ต้องเป็นไฟล์ PNG หรือ WebP ที่ลบพื้นหลังออกแล้ว (JPG ทำพื้นหลังโปร่งใสไม่ได้)"); if (file.size > 2 * 1024 * 1024) return setError("กรุณาเลือกไฟล์ขนาดไม่เกิน 2 MB"); const reader = new FileReader(); reader.onerror = () => setError("อ่านไฟล์ไม่สำเร็จ กรุณาลองอีกครั้ง"); reader.onload = () => { setPendingLogo(String(reader.result)); setRemoveLogo(false); }; reader.readAsDataURL(file); }
  function clearLogo() { setPendingLogo(null); setRemoveLogo(!!logoUrl); setError(""); }

  async function save() {
    if (saving || !dirty) return;
    setSaving(true); setError(""); setSuccess(false);
    try {
      const body: Record<string, unknown> = {};
      if (primaryTouched) body.primaryColor = primaryColor;
      if (secondaryTouched) body.secondaryColor = secondaryColor;
      if (pendingLogo) body.logo = pendingLogo;
      if (removeLogo) body.removeLogo = true;
      const response = await fetch("/api/brand-kit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data: { ok?: unknown; error?: unknown } = await response.json();
      if (!response.ok || data.ok !== true) throw new Error(typeof data.error === "string" ? data.error : "บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง");
      if (pendingLogo) setLogoUrl(pendingLogo);
      if (removeLogo) setLogoUrl(null);
      setPendingLogo(null); setRemoveLogo(false); setPrimaryTouched(false); setSecondaryTouched(false);
      setSuccess(true); router.refresh(); setTimeout(() => setSuccess(false), 3000);
    } catch (e) { setError(e instanceof Error ? e.message : "บันทึกข้อมูลไม่สำเร็จ กรุณาลองอีกครั้ง"); }
    finally { setSaving(false); }
  }

  return <>
    <PageHeader eyebrow="IDENTITY / BRAND" number="BRAND / 008" title={<>Every image.<br />On brand<span className="text-accent">.</span></>} description={<>ตั้งค่าโลโก้และโทนสีแบรนด์ ระบบจะใช้ประกอบการสร้างภาพและประทับลงบนผลลัพธ์โดยอัตโนมัติ</>} />
    <div className="page-wrap">
      {error && <div role="alert" className="mb-6 border border-danger bg-danger-bg p-4 text-sm text-danger">{error}</div>}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="border border-ink p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-medium">โลโก้แบรนด์</h2><span className="micro">01 / LOGO</span></div>
          <div className="mb-4 flex h-40 items-center justify-center border border-line bg-surface-alt p-4">{previewLogo ? <img src={previewLogo} alt="โลโก้แบรนด์" className="max-h-full max-w-full object-contain" /> : <p className="text-center text-sm text-muted-soft">ยังไม่ได้อัปโหลดโลโก้</p>}</div>
          <input ref={input} type="file" accept="image/png,image/webp" className="sr-only" onChange={e => { chooseFile(e.target.files?.[0]); e.target.value = ""; }} />
          <button type="button" disabled={saving} onClick={() => input.current?.click()} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files[0]); }} className={`dropzone w-full p-5 ${dragging ? "dragging" : ""} ${focus}`}><span><span aria-hidden="true" className="mb-3 block text-3xl font-light">＋</span><span className="block">ลากไฟล์มาวาง หรือเลือกไฟล์โลโก้</span><span className="mt-2 block font-mono text-xs text-muted">PNG / WEBP · พื้นหลังโปร่งใส · MAX. 2 MB</span></span></button>
          {previewLogo && <button type="button" disabled={saving} onClick={clearLogo} className={`btn-outline mt-4 w-full text-xs ${focus}`}>ลบโลโก้</button>}
          <p className="mt-4 text-xs leading-5 text-muted-soft">โลโก้จะถูกประทับที่มุมขวาล่างของภาพที่สร้างขึ้นโดยอัตโนมัติ (ยกเว้นเครื่องมือขยายภาพ) — ต้องเป็นไฟล์ที่ลบพื้นหลังออกแล้ว ไม่งั้นจะกลายเป็นกรอบสี่เหลี่ยมทึบทับภาพ</p>
        </div>
        <div className="border border-ink p-6">
          <div className="mb-5 flex items-center justify-between"><h2 className="font-medium">โทนสีแบรนด์</h2><span className="micro">02 / COLORS</span></div>
          <div className="space-y-4">
            <div className="flex items-center gap-4 border border-line p-4">
              <input type="color" value={primaryColor ?? "#000000"} disabled={saving} onChange={e => { setPrimaryColor(e.target.value); setPrimaryTouched(true); }} aria-label="สีหลักของแบรนด์" className={`h-12 w-16 cursor-pointer border border-line bg-transparent p-1 ${focus}`} />
              <div><p className="text-sm font-medium">สีหลัก (Primary)</p><p className="mt-1 font-mono text-xs text-muted-soft">{primaryColor ? primaryColor.toUpperCase() : "ยังไม่ได้ตั้งค่า"}</p></div>
            </div>
            <div className="flex items-center gap-4 border border-line p-4">
              <input type="color" value={secondaryColor ?? "#000000"} disabled={saving} onChange={e => { setSecondaryColor(e.target.value); setSecondaryTouched(true); }} aria-label="สีรองของแบรนด์" className={`h-12 w-16 cursor-pointer border border-line bg-transparent p-1 ${focus}`} />
              <div><p className="text-sm font-medium">สีรอง (Secondary)</p><p className="mt-1 font-mono text-xs text-muted-soft">{secondaryColor ? secondaryColor.toUpperCase() : "ยังไม่ได้ตั้งค่า"}</p></div>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted-soft">ระบบจะใช้สีเหล่านี้ช่วยกำหนดโทนบรรยากาศ พื้นหลัง และแสงของภาพที่สร้างโดย AI แบบไม่ตายตัว ไม่ใช่การพิมพ์ข้อความหรือโลโก้ทับภาพ</p>
        </div>
      </section>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-6">
        <button type="button" disabled={saving || !dirty} onClick={save} className={`btn-primary flex items-center gap-3 px-6 ${focus}`}>{saving ? "กำลังบันทึก…" : "บันทึก Brand Kit"}</button>
        {success && <p className="text-sm text-success">✓ บันทึกเรียบร้อย</p>}
      </div>
    </div>
  </>;
}
