"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`);
      return;
    }
    if (password !== confirm) {
      setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="auth-wrap grid-paper">
      <div className="auth-card">
        <p className="micro mb-1 text-accent-dark">RESET / 002</p>
        <h1 className="mb-6 text-3xl font-semibold tracking-[-.05em]">ตั้งรหัสผ่านใหม่</h1>

        {error && <p role="alert" className="status-line mb-5 text-sm">{error}</p>}

        <form onSubmit={handleSubmit} className="grid gap-4">
          <label className="text-sm">
            รหัสผ่านใหม่
            <input
              type="password"
              required
              autoComplete="new-password"
              className="form-field mt-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="text-sm">
            ยืนยันรหัสผ่านใหม่
            <input
              type="password"
              required
              autoComplete="new-password"
              className="form-field mt-2"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <button type="submit" disabled={loading} className="btn-primary mt-2 flex items-center justify-center gap-2">
            {loading && <span className="spinner" />}
            บันทึกรหัสผ่านใหม่
          </button>
        </form>
      </div>
    </div>
  );
}
