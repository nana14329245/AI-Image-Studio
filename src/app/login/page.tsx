"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"password" | "google" | null>(null);

  async function handlePasswordLogin(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("password");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(null);
    if (error) {
      setError(error.message === "Invalid login credentials" ? "อีเมลหรือรหัสผ่านไม่ถูกต้อง" : error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function handleGoogleLogin() {
    setError(null);
    setLoading("google");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message);
      setLoading(null);
    }
    // on success the browser is redirected to Google; no further action needed here
  }

  return (
    <div className="auth-wrap grid-paper">
      <div className="auth-card">
        <Link href="/" className="text-xl font-extrabold tracking-[-0.07em] control-focus">
          AI<span className="mx-1 text-accent">/</span>IMAGE<span className="ml-2 align-top text-[9px] tracking-normal">STUDIO</span>
        </Link>
        <p className="micro mt-4 mb-1 text-accent-dark">LOGIN / 000</p>
        <h1 className="mb-6 text-3xl font-semibold tracking-[-.05em]">เข้าสู่ระบบ</h1>

        {error && <p className="status-line mb-5 text-sm">{error}</p>}

        <form onSubmit={handlePasswordLogin} className="grid gap-4">
          <label className="text-sm">
            อีเมล
            <input type="email" required autoComplete="email" className="form-field mt-2" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="flex items-baseline justify-between gap-3">
              รหัสผ่าน
              <Link href="/forgot-password" className="text-xs text-muted underline underline-offset-4 hover:text-ink control-focus">ลืมรหัสผ่าน?</Link>
            </span>
            <input type="password" required autoComplete="current-password" className="form-field mt-2" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit" disabled={loading !== null} className="btn-primary mt-2 flex items-center justify-center gap-2">
            {loading === "password" && <span className="spinner" />}
            เข้าสู่ระบบ
          </button>
        </form>

        <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />หรือ<span className="h-px flex-1 bg-line" /></div>

        <button onClick={handleGoogleLogin} disabled={loading !== null} className="btn-outline flex w-full items-center justify-center gap-2">
          {loading === "google" && <span className="spinner" />}
          ดำเนินการต่อด้วย Google
        </button>

        <p className="mt-6 text-center text-sm text-muted">
          ยังไม่มีบัญชี? <Link href="/signup" className="font-medium text-ink underline underline-offset-4 control-focus">สมัครสมาชิก</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
