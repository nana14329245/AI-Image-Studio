import { requireSupabaseConfig } from "./config";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Reads/writes the session via Next.js cookies(). In a Server Component,
 * cookie writes are ignored (Next.js only allows writes from actions/handlers) —
 * session refresh for that case is handled by `src/middleware.ts`.
 */
export async function createClient() {
  const settings = requireSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(
    settings.url,
    settings.key,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // called from a Server Component — safe to ignore, middleware refreshes the session
          }
        },
      },
    }
  );
}

/**
 * Service-role client for trusted server-only operations that must bypass
 * RLS (webhooks, admin credit grants). NEVER import this from client code
 * or expose SUPABASE_SERVICE_ROLE_KEY to the browser.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
