create or replace function public.spend_credits(
  p_user_id uuid,
  p_amount integer,
  p_tool text,
  p_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance integer;
  v_generation_id text := p_metadata ->> 'generationId';
begin
  if auth.uid() is distinct from p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_amount <= 0 then
    raise exception 'amount must be positive';
  end if;
  if v_generation_id is null or v_generation_id = '' then
    raise exception 'generationId is required';
  end if;

  select credits into v_balance from public.profiles where id = p_user_id for update;
  if v_balance is null then
    raise exception 'profile not found';
  end if;

  if exists (
    select 1
    from public.credit_ledger
    where user_id = p_user_id
      and reason = 'tool_spend'
      and metadata ->> 'generationId' = v_generation_id
  ) then
    return v_balance;
  end if;

  if v_balance < p_amount then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  update public.profiles set credits = credits - p_amount where id = p_user_id
    returning credits into v_balance;
  insert into public.credit_ledger (user_id, delta, balance_after, reason, tool, metadata)
  values (p_user_id, -p_amount, v_balance, 'tool_spend', p_tool, p_metadata);
  return v_balance;
end;
$$;

revoke all on function public.spend_credits(uuid, integer, text, jsonb) from public;
grant execute on function public.spend_credits(uuid, integer, text, jsonb) to authenticated;
