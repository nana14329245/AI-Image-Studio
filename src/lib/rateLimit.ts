import type { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Per-action limits. Tune per tool cost/latency. */
const LIMITS: Record<
  string,
  { userLimit: number; userWindowSeconds: number; ipLimit: number; ipWindowSeconds: number }
> = {
  upscale: { userLimit: 10, userWindowSeconds: 60, ipLimit: 20, ipWindowSeconds: 60 },
  product: { userLimit: 8, userWindowSeconds: 60, ipLimit: 16, ipWindowSeconds: 60 },
  ads: { userLimit: 8, userWindowSeconds: 60, ipLimit: 16, ipWindowSeconds: 60 },
  portrait: { userLimit: 8, userWindowSeconds: 60, ipLimit: 16, ipWindowSeconds: 60 },
  billing: { userLimit: 10, userWindowSeconds: 60, ipLimit: 20, ipWindowSeconds: 60 },
  default: { userLimit: 20, userWindowSeconds: 60, ipLimit: 40, ipWindowSeconds: 60 },
};

export function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Logs this attempt and returns whether it's allowed under both the
 * per-user and per-IP sliding-window limits. Fails OPEN only if the
 * rate-limit check itself errors (so a DB hiccup doesn't take the product
 * down) — but that error is surfaced to the caller so it can be logged.
 */
export async function checkRateLimit(params: {
  userId: string | null;
  ip: string;
  action: string;
}): Promise<{ allowed: boolean; error?: string }> {
  const cfg = LIMITS[params.action] ?? LIMITS.default;
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_user_id: params.userId,
    p_ip: params.ip,
    p_action: params.action,
    p_user_limit: cfg.userLimit,
    p_user_window_seconds: cfg.userWindowSeconds,
    p_ip_limit: cfg.ipLimit,
    p_ip_window_seconds: cfg.ipWindowSeconds,
  });

  if (error) {
    return { allowed: true, error: error.message };
  }
  return { allowed: Boolean(data) };
}
