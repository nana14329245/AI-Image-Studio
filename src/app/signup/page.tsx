"use client";

import Link from "next/link";
import { track } from "@/lib/analytics";
import { SIGNUP_CREDITS } from "@/lib/plans";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState<"password" | "google" | null>(null);

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setLoading("password");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name || undefined },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(null);
    if (error) {
      setError(error.message);
      return;
    }
    track("signup_completed", { method: "email" });
    setDone(true);
  }

  async function handleGoogleSignup() {
    setError(null);
    setLoading("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
  }

  if (done) {
    return (
      <div className="auth-wrap grid-paper">
        <div className="auth-card text-center">
          <p className="micro mb-3 text-accent-dark">ยืนยันอีเมลของคุณ</p>
          <h1 className="mb-3 text-2xl font-semibold tracking-[-.05em]">ตรวจสอบกล่องอีเมลของคุณ</h1>
          <p className="text-sm leading-6 text-muted">เราได้ส่งลิงก์ยืนยันไปที่ {email} แล้ว กดลิงก์ในอีเมลเพื่อเริ่มใช้งานพร้อมเครดิตฟรี {SIGNUP_CREDITS} เครดิต</p>
          <Link href="/login" className="btn-outline mt-6 inline-flex">กลับไปหน้าเข้าสู่ระบบ</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap grid-paper">
      <div className="auth-card">
        <Link href="/" className="text-xl font-extrabold tracking-[-0.07em] control-focus">
          AI<span className="mx-1 text-accent">/</span>IMAGE<span className="ml-2 align-top text-[9px] tracking-normal">STUDIO</span>
        </Link>
        <p className="micro mt-4 mb-1 text-accent-dark">SIGNUP / 000</p>
        <h1 className="mb-1 text-3xl font-semibold tracking-[-.05em]">สร้างบัญชีใหม่</h1>
        <p className="mb-6 text-sm text-muted">รับ {SIGNUP_CREDITS} เครดิตฟรีทันทีที่สมัคร</p>

        {error && <p className="status-line mb-5 text-sm">{error}</p>}

        <form onSubmit={handleSignup} className="grid gap-4">
          <label className="text-sm">
            ชื่อที่แสดง
            <input type="text" autoComplete="name" className="form-field mt-2" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="text-sm">
            อีเมล
            <input type="email" required autoComplete="email" className="form-field mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="text-sm">
            รหัสผ่าน
            <input type="password" required autoComplete="new-password" minLength={8} className="form-field mt-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" disabled={loading !== null} className="btn-primary mt-2 flex items-center justify-center gap-2">
            {loading === "password" && <span className="spinner" />}
            สมัครสมาชิก
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />หรือ<span className="h-px flex-1 bg-line" /></div>

        <button onClick={handleGoogleSignup} disabled={loading !== null} className="btn-outline flex w-full items-center justify-center gap-2">
          {loading === "google" && <span className="spinner" />}
          ดำเนินการต่อด้วย Google
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          มีบัญชีอยู่แล้ว? <Link href="/login" className="font-medium text-ink underline underline-offset-4 control-focus">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </div>
  );
}
