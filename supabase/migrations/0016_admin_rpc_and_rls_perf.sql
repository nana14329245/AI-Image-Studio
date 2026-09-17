-- Two things found on the live database that 0015 missed, plus RLS/index
-- hardening flagged by Supabase's advisors. Nothing here changes behavior on
-- the live DB (every object already exists identically); this is catch-up
-- plus performance-only policy rewrites.

-- ============================================================================
-- 1. ADMIN ACTION RPC — 0015 captured admin_audit_log and tool_settings, but
--    not the function that actually writes to them. Grep src/ again: still
--    nothing references it — this exists only as a direct-SQL/RPC admin tool,
--    called today via `select public.admin_action(...)` in the SQL editor or
--    a PostgREST call with an admin's own session, not from app code.
-- ============================================================================
create or replace function public.admin_action(p_action text, p_target uuid, p_payload jsonb, p_reason text, p_request uuid)
returns void
language plpgsql
security definer set search_path to ''
as $$
declare
  v_actor uuid := auth.uid(); v_before public.profiles%rowtype;
  v_delta integer; v_balance integer; v_tool text; v_cost integer; v_enabled boolean; v_details jsonb;
begin
  -- Lock actor to serialize revocation/suspension against this operation.
  perform 1 from public.profiles where id=v_actor and role='admin' and not is_suspended for update;
  if not found then raise exception 'admin_required' using errcode='42501'; end if;
  if p_request is null or p_reason is null or length(trim(p_reason)) not between 3 and 500 then raise exception 'invalid_request'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request::text,0));
  if exists(select 1 from public.admin_audit_log where request_id=p_request and actor_id=v_actor and action=p_action and target_id is not distinct from p_target and details->'request'=p_payload and reason=trim(p_reason)) then return; end if;
  if exists(select 1 from public.admin_audit_log where request_id=p_request) then raise exception 'request_conflict'; end if;
  if p_action in ('credits','suspend') then
   select * into v_before from public.profiles where id=p_target for update;
   if not found then raise exception 'user_not_found'; end if;
   if p_action='credits' then
    v_delta := (p_payload->>'delta')::integer;
    if v_delta is null or v_delta=0 or abs(v_delta::bigint)>100000 then raise exception 'invalid_amount'; end if;
    v_balance := v_before.credits + v_delta;
    if v_balance<0 then raise exception 'insufficient_credits'; end if;
    update public.profiles set credits=v_balance where id=p_target;
    insert into public.credit_ledger(user_id,delta,balance_after,reason,metadata)
    values(p_target,v_delta,v_balance,'admin_adjustment',jsonb_build_object('actor_id',v_actor,'reason',trim(p_reason),'request_id',p_request));
    v_details := jsonb_build_object('before',v_before.credits,'after',v_balance);
   else
    -- Admin status is managed in SQL only; prevents self/last-admin lockout.
    if v_before.role='admin' then raise exception 'cannot_suspend_admin'; end if;
    if jsonb_typeof(p_payload->'suspended') is distinct from 'boolean' then raise exception 'invalid_status'; end if;
    update public.profiles set is_suspended=(p_payload->>'suspended')::boolean where id=p_target;
    v_details := jsonb_build_object('before',v_before.is_suspended,'after',(p_payload->>'suspended')::boolean);
   end if;
  elsif p_action='tool' then
   v_tool:=p_payload->>'tool'; v_cost:=(p_payload->>'cost')::integer;
   if jsonb_typeof(p_payload->'enabled') is distinct from 'boolean' or v_cost is null or v_cost not between 1 and 10000 then raise exception 'invalid_tool_settings'; end if;
   v_enabled:=(p_payload->>'enabled')::boolean;
   if v_tool <> 'upscale' and v_enabled then raise exception 'tool_not_implemented'; end if;
   select jsonb_build_object('enabled',enabled,'cost',credit_cost) into v_details from public.tool_settings where tool=v_tool for update;
   if not found then raise exception 'tool_not_found'; end if;
   update public.tool_settings set enabled=v_enabled,credit_cost=v_cost where tool=v_tool;
   v_details:=jsonb_build_object('before',v_details,'after',p_payload);
  else raise exception 'invalid_action'; end if;
  insert into public.admin_audit_log(request_id,actor_id,target_id,action,reason,details)
  values(p_request,v_actor,p_target,p_action,trim(p_reason),v_details || jsonb_build_object('request',p_payload));
end;
$$;

-- ============================================================================
-- 2. TWO MORE POLICIES 0015 MISSED — admins reading the ledger and gallery.
--    Written already wrapped in a scalar subquery; see §4 for why.
-- ============================================================================
drop policy if exists "ledger_admin_read" on public.credit_ledger;
create policy "ledger_admin_read" on public.credit_ledger
  for select using ((select public.is_admin()));

drop policy if exists "generations_admin_read" on public.generations;
create policy "generations_admin_read" on public.generations
  for select using ((select public.is_admin()));

-- ============================================================================
-- 3. INDEXES FOR FOREIGN KEYS — flagged by the performance advisor. Without
--    these, deleting or looking up by the referenced profile does a seq scan.
-- ============================================================================
create index if not exists admin_audit_log_actor_id_idx on public.admin_audit_log (actor_id);
create index if not exists admin_audit_log_target_id_idx on public.admin_audit_log (target_id);
create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);
-- rate_limit_events already has two composite indexes led by `action`; neither
-- covers a plain lookup or cascade delete by user_id alone.
create index if not exists rate_limit_events_user_id_idx on public.rate_limit_events (user_id);

-- ============================================================================
-- 4. RLS PERFORMANCE — every policy that calls auth.uid() or a wrapper
--    (is_admin(), is_active_member()) directly gets re-evaluated once per row.
--    Wrapping the call as a scalar subquery lets Postgres evaluate it once per
--    query instead. Purely a rewrite: every USING/WITH CHECK below is
--    logically identical to what it replaces (see migrations 0001 and 0016 §2
--    above, and 0015 for the is_admin()/is_active_member() ones).
-- ============================================================================
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using ((select auth.uid()) = id and (select public.is_active_member()))
  with check ((select auth.uid()) = id and (select public.is_active_member()));

drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles
  for select using ((select public.is_admin()));

drop policy if exists "ledger_select_own" on public.credit_ledger;
create policy "ledger_select_own" on public.credit_ledger
  for select using ((select auth.uid()) = user_id);

drop policy if exists "generations_select_own" on public.generations;
create policy "generations_select_own" on public.generations
  for select using ((select auth.uid()) = user_id);

drop policy if exists "generations_insert_own" on public.generations;
create policy "generations_insert_own" on public.generations
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "generations_delete_own" on public.generations;
create policy "generations_delete_own" on public.generations
  for delete using ((select auth.uid()) = user_id);

drop policy if exists "generations_active" on public.generations;
create policy "generations_active" on public.generations as restrictive
  for all using ((select public.is_active_member())) with check ((select public.is_active_member()));

drop policy if exists "storage_active" on storage.objects;
create policy "storage_active" on storage.objects as restrictive
  for all using (bucket_id <> 'generations' or (select public.is_active_member()))
  with check (bucket_id <> 'generations' or (select public.is_active_member()));

drop policy if exists "audit_admin_read" on public.admin_audit_log;
create policy "audit_admin_read" on public.admin_audit_log
  for select using ((select public.is_admin()));

drop policy if exists "settings_read" on public.tool_settings;
create policy "settings_read" on public.tool_settings
  for select using ((select public.is_active_member()));
