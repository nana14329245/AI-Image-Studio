"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Shown whether or not the address has an account, so this page cannot be
    // used to check which emails are registered.
    setSent(true);
  }

  return (
    <div className="auth-wrap grid-paper">
      <div className="auth-card">
        <Link href="/" className="text-xl font-extrabold tracking-[-0.07em] control-focus">
          AI<span className="mx-1 text-accent">/</span>IMAGE<span className="ml-2 align-top text-[9px] tracking-normal">STUDIO</span>
        </Link>
        <p className="micro mt-4 mb-1 text-accent-dark">RESET / 001</p>
        <h1 className="mb-6 text-3xl font-semibold tracking-[-.05em]">ลืมรหัสผ่าน</h1>

        {sent ? (
          <>
            <p className="status-line status-ok mb-6 text-sm">
              ถ้ามีบัญชีที่ใช้อีเมลนี้ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว กรุณาตรวจกล่องจดหมาย
            </p>
            <Link href="/login" className="btn-outline flex w-full items-center justify-center text-sm control-focus">
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </>
        ) : (
          <>
            <p className="mb-6 text-sm leading-6 text-muted">
              กรอกอีเมลที่ใช้สมัคร ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
            </p>

            {error && <p role="alert" className="status-line mb-5 text-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="grid gap-4">
              <label className="text-sm">
                อีเมล
                <input
                  type="email"
                  required
                  autoComplete="email"
                  className="form-field mt-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <button type="submit" disabled={loading} className="btn-primary mt-2 flex items-center justify-center gap-2">
                {loading && <span className="spinner" />}
                ส่งลิงก์ตั้งรหัสผ่านใหม่
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              นึกออกแล้ว? <Link href="/login" className="font-medium text-ink underline underline-offset-4 control-focus">เข้าสู่ระบบ</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
