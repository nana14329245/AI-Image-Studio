create or replace function public.grant_credits(
  p_user_id uuid,
  p_amount  integer,
  p_reason  text,
  p_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
  v_event_id text := p_metadata ->> 'stripeEventId';
begin
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;

  if v_event_id is not null and v_event_id <> '' and exists (
    select 1
    from public.credit_ledger
    where user_id = p_user_id
      and reason = p_reason
      and metadata ->> 'stripeEventId' = v_event_id
  ) then
    select credits into v_balance from public.profiles where id = p_user_id;
    if v_balance is null then
      raise exception 'profile not found';
    end if;
    return v_balance;
  end if;

  update public.profiles set credits = credits + p_amount where id = p_user_id
    returning credits into v_balance;
  if v_balance is null then
    raise exception 'profile not found';
  end if;

  insert into public.credit_ledger (user_id, delta, balance_after, reason, metadata)
  values (p_user_id, p_amount, v_balance, p_reason, p_metadata);

  return v_balance;
end;
$$;
