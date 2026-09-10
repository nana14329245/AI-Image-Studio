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

/** Grants credits (subscription renewal, top-up, admin adjustment, signup bonus top-ups). */
export async function grantCredits(
  supabase: SupabaseClient,
  userId: string,
  amount: number,
  reason: string,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  const { data, error } = await supabase.rpc("grant_credits", {
    p_user_id: userId,
    p_amount: amount,
    p_reason: reason,
    p_metadata: metadata,
  });
  if (error) throw error;
  return data as number;
}
