import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type PlanId } from "@/lib/plans";
import { grantsPaidPlan, toSubscriptionStatus } from "@/lib/subscriptions";
import PromotionsClient from "./PromotionsClient";

export default async function PromotionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan, subscription_status")
    .eq("id", user.id)
    .single();

  const currentPlan = (profile?.plan as PlanId) || "free";
  const subscribed = currentPlan !== "free" && grantsPaidPlan(toSubscriptionStatus(profile?.subscription_status));

  return <PromotionsClient currentPlan={currentPlan} subscribed={subscribed} />;
}
