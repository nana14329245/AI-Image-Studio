-- Capture the admin/suspension objects that already exist on the live
-- database but were never checked into a migration file. None of this is
-- wired into the app yet (grep src/ for is_admin, is_suspended,
-- admin_audit_log or tool_settings — nothing matches); it only exists so a
-- fresh database (staging, disaster recovery) matches production, and so
-- future admin-panel work has a migration to build on instead of more
-- hand-run SQL. Every statement mirrors the live definitions exactly
-- (columns, constraints, functions, grants, policies) captured via the
-- Supabase MCP tools; the DB itself is left untouched.

-- ============================================================================
-- 1. PROFILES — role and suspension flag
-- ============================================================================
alter table public.profiles
  add column if not exists role text not null default 'member';
alter table public.profiles
  add column if not exists is_suspended boolean not null default false;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member', 'admin'));

-- security definer + empty search_path: callers can't shadow public.profiles
-- with a same-named object earlier in their own search_path.
create or replace function public.is_admin()
returns boolean
language sql
stable security definer set search_path to ''
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'admin' and not is_suspended);
$$;

create or replace function public.is_active_member()
returns boolean
language sql
stable security definer set search_path to ''
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and not is_suspended);
$$;

-- admins can read every profile, not just their own.
drop policy if exists "profiles_admin_read" on public.profiles;
create policy "profiles_admin_read" on public.profiles
  for select using (public.is_admin());

-- a suspended account keeps profiles_select_own (so the app can still show
-- "your account is suspended") but loses the ability to update its own row.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id and public.is_active_member())
  with check (auth.uid() = id and public.is_active_member());

-- suspension blocks writes anywhere is_active_member() is checked (generations,
-- the generations storage bucket below); it does not by itself revoke reads.
drop policy if exists "generations_active" on public.generations;
create policy "generations_active" on public.generations as restrictive
  for all using (public.is_active_member()) with check (public.is_active_member());

drop policy if exists "storage_active" on storage.objects;
create policy "storage_active" on storage.objects as restrictive
  for all using (bucket_id <> 'generations' or public.is_active_member())
  with check (bucket_id <> 'generations' or public.is_active_member());

-- ============================================================================
-- 2. ADMIN AUDIT LOG — append-only record of admin actions
-- ============================================================================
create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  request_id  uuid not null unique, -- lets a retried admin action no-op instead of double-logging
  actor_id    uuid not null references public.profiles (id),
  target_id   uuid references public.profiles (id),
  action      text not null,
  reason      text not null,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;

grant select on public.admin_audit_log to authenticated;

drop policy if exists "audit_admin_read" on public.admin_audit_log;
create policy "audit_admin_read" on public.admin_audit_log
  for select using (public.is_admin());
-- no insert/update/delete policy for authenticated: only a service-role
-- client (an admin API route) may write to this table.

-- ============================================================================
-- 3. TOOL SETTINGS — per-tool enable flag and credit cost, admin-editable
-- ============================================================================
create table if not exists public.tool_settings (
  tool        text primary key,
  enabled     boolean not null default false,
  credit_cost integer not null
);

alter table public.tool_settings drop constraint if exists tool_settings_tool_check;
alter table public.tool_settings add constraint tool_settings_tool_check
  check (tool in ('upscale', 'product', 'ads', 'portrait'));

alter table public.tool_settings drop constraint if exists tool_settings_credit_cost_check;
alter table public.tool_settings add constraint tool_settings_credit_cost_check
  check (credit_cost between 1 and 10000);

alter table public.tool_settings enable row level security;

grant select on public.tool_settings to authenticated;

drop policy if exists "settings_read" on public.tool_settings;
create policy "settings_read" on public.tool_settings
  for select using (public.is_active_member());
-- no insert/update/delete policy for authenticated: only a service-role
-- client (an admin API route) may write to this table.

-- Seed rows only if the table is empty elsewhere (a fresh database); an
-- admin may have already changed these on a database that already had them.
insert into public.tool_settings (tool, enabled, credit_cost) values
  ('upscale', true, 4),
  ('product', false, 6),
  ('ads', false, 8),
  ('portrait', false, 6)
on conflict (tool) do nothing;
