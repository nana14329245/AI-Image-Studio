/** Shared public configuration. Keep direct env references for Next.js inlining. */
export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key || /your[-_]|YOUR_|<|>/.test(url + key)) return null;
  try {
    const parsed = new URL(url);
    if (!["https:", "http:"].includes(parsed.protocol)) return null;
  } catch {
    return null;
  }
  if (key.startsWith("sb_secret_")) return null;
  return { url, key };
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error("Supabase is not configured. Open /setup and set the project URL and public key in .env.local, then restart the server.");
  }
  return config;
}
