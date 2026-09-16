-- Charge credits when a generation is submitted, refund them when it fails, and
-- cap how many unused subscription credits carry over.
--
-- Until now credits were deducted only when the browser polled for a finished
-- result. A job whose page was closed — or that was submitted straight to the API
-- and never polled — was paid for at fal.ai and never charged to the user, and
-- several jobs could be submitted at once against a balance that covered one.
-- The application now calls spend_credits at submission (it already locks the
-- profile row and is idempotent per generation) and calls the refund below when a
-- generation fails.

-- ---------------------------------------------------------------------------
-- refund_generation_credits
-- ---------------------------------------------------------------------------
-- Returns the credits a generation was charged, once. Safe to call for a
-- generation that was never charged or was already refunded; both are no-ops.
create or replace function public.refund_generation_credits(p_generation_id uuid)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid;
  v_balance integer;
  v_charged integer;
  v_tool text;
begin
  select user_id into v_user_id from public.generations where id = p_generation_id;
  if v_user_id is null then
    return null;
  end if;

  -- Lock first so two concurrent failure paths cannot both refund.
  select credits into v_balance from public.profiles where id = v_user_id for update;
  if v_balance is null then
    raise exception 'profile not found';
  end if;

  select -delta, tool into v_charged, v_tool
  from public.credit_ledger
  where user_id = v_user_id
    and reason = 'tool_spend'
    and metadata ->> 'generationId' = p_generation_id::text
  limit 1;

  if v_charged is null or v_charged <= 0 then
    return v_balance;
  end if;

  if exists (
    select 1 from public.credit_ledger
    where user_id = v_user_id
      and reason = 'generation_refund'
      and metadata ->> 'generationId' = p_generation_id::text
  ) then
    return v_balance;
  end if;

  update public.profiles set credits = credits + v_charged where id = v_user_id
    returning credits into v_balance;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, tool, metadata)
  values (v_user_id, v_charged, v_balance, 'generation_refund', v_tool,
          jsonb_build_object('generationId', p_generation_id::text));

  return v_balance;
end;
$$;

-- ---------------------------------------------------------------------------
-- grant_subscription_credits
-- ---------------------------------------------------------------------------
-- Adds a plan's monthly credits without letting the balance grow past p_cap.
-- A balance already above the cap is left as it is rather than reduced. Always
-- writes a ledger row, even for a zero grant, because that row is what makes a
-- redelivered Stripe event a no-op.
--
-- Unlike grant_credits, the profile is locked before the idempotency check, so
-- the same event delivered twice at once cannot be granted twice.
create or replace function public.grant_subscription_credits(
  p_user_id  uuid,
  p_amount   integer,
  p_cap      integer,
  p_reason   text,
  p_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_previous integer;
  v_balance integer;
  v_event_id text := p_metadata ->> 'stripeEventId';
begin
  if p_amount <= 0 or p_cap <= 0 then
    raise exception 'amount and cap must be positive';
  end if;
  if v_event_id is null or v_event_id = '' then
    raise exception 'stripeEventId is required';
  end if;

  select credits into v_previous from public.profiles where id = p_user_id for update;
  if v_previous is null then
    raise exception 'profile not found';
  end if;

  if exists (
    select 1 from public.credit_ledger
    where user_id = p_user_id
      and reason = p_reason
      and metadata ->> 'stripeEventId' = v_event_id
  ) then
    return v_previous;
  end if;

  update public.profiles
    set credits = least(v_previous + p_amount, greatest(v_previous, p_cap))
    where id = p_user_id
    returning credits into v_balance;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, metadata)
  values (p_user_id, v_balance - v_previous, v_balance, p_reason,
          p_metadata || jsonb_build_object('requested', p_amount, 'cap', p_cap));

  return v_balance;
end;
$$;

-- Both functions move credits, so only the server may call them. Supabase grants
-- execute on new public functions to anon and authenticated by default, which is
-- why those roles are revoked explicitly rather than relying on PUBLIC.
revoke all on function public.refund_generation_credits(uuid) from public, anon, authenticated;
grant execute on function public.refund_generation_credits(uuid) to service_role;

revoke all on function public.grant_subscription_credits(uuid, integer, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.grant_subscription_credits(uuid, integer, integer, text, jsonb) to service_role;
