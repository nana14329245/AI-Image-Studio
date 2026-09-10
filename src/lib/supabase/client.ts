import { requireSupabaseConfig } from "./config";
import { createBrowserClient } from "@supabase/ssr";

/** Supabase client for use inside Client Components ("use client"). */
export function createClient() {
  const settings = requireSupabaseConfig();
  return createBrowserClient(
    settings.url,
    settings.key
  );
}
