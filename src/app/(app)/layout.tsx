import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import StudioShell from "@/components/StudioShell";
import { createClient } from "@/lib/supabase/server";
import { planById } from "@/lib/plans";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defense in depth — src/middleware.ts already redirects unauthenticated
  // requests before they reach here.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email, credits, plan")
    .eq("id", user.id)
    .single();

  const plan = planById(profile?.plan);

  return (
    <StudioShell
      userId={user.id}
      email={profile?.email ?? user.email ?? ""}
      displayName={profile?.display_name ?? null}
      credits={profile?.credits ?? 0}
      creditsCap={plan.monthlyCredits}
      planName={plan.name}
    >
      {children}
    </StudioShell>
  );
}
