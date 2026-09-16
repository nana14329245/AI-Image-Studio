import type { SupabaseClient } from "@supabase/supabase-js";

export class InsufficientCreditsError extends Error {
  constructor() {
    super("insufficient_credits");
    this.name = "InsufficientCreditsError";
  }
}

/** Atomically deducts credits for a tool run. Throws InsufficientCreditsError if the balance is too low. */
export async function spendCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  tool: string,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  const { data, error } = await supabase.rpc("spend_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_tool: tool,
    p_metadata: metadata,
  });
  if (error) {
    if (error.message?.includes("insufficient_credits")) throw new InsufficientCreditsError();
    throw error;
  }
  return data as number;
}

/**
 * Returns what a failed generation was charged, at most once. A generation that
 * was never charged or was already refunded is a no-op. Service role only.
 */
export async function refundGenerationCredits(supabase: SupabaseClient, generationId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("refund_generation_credits", { p_generation_id: generationId });
  if (error) throw error;
  return data as number | null;
}

/**
 * Adds a plan's monthly credits without letting the balance pass `cap`, keyed on
 * the Stripe event id so a redelivered webhook grants nothing. Service role only.
 */
export async function grantSubscriptionCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  cap: number,
  metadata: Record<string, unknown> & { stripeEventId: string }
): Promise<number> {
  const { data, error } = await supabase.rpc("grant_subscription_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_cap: cap,
    p_reason: "subscription_grant",
    p_metadata: metadata,
  });
  if (error) throw error;
  return data as number;
}
