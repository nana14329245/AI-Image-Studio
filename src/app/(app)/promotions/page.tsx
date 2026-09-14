import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { type PlanId } from "@/lib/plans";
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
    .select("plan, credits")
    .eq("id", user.id)
    .single();

  const currentPlan = (profile?.plan as PlanId) || "free";
  const currentCredits = profile?.credits ?? 0;

  return <PromotionsClient currentPlan={currentPlan} currentCredits={currentCredits} />;
}
