import { redirect } from "next/navigation";
import AccountClient from "./AccountClient";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, credits, plan, subscription_status, current_period_end, cancel_at_period_end, stripe_customer_id"
    )
    .eq("id", user.id)
    .single();

  const { data: ledger } = await supabase
    .from("credit_ledger")
    .select("id, delta, balance_after, reason, tool, metadata, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const safeProfile = {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    display_name: profile?.display_name ?? null,
    credits: profile?.credits ?? 0,
    plan: (profile?.plan as "free" | "pro" | "business") ?? "free",
    subscription_status: profile?.subscription_status ?? "none",
    current_period_end: profile?.current_period_end ?? null,
    cancel_at_period_end: profile?.cancel_at_period_end ?? false,
    stripe_customer_id: profile?.stripe_customer_id ?? null,
  };

  return (
    <AccountClient
      profile={safeProfile}
      ledger={
        ledger?.map((item) => ({
          ...item,
          metadata: (item.metadata as Record<string, unknown>) || {},
        })) || []
      }
    />
  );
}
