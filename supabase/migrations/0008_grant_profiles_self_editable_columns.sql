-- The "authenticated" role was never granted UPDATE on public.profiles at
-- all (RLS policy profiles_update_own existed, but Postgres checks
-- table/column-level GRANTs before RLS, so it was unreachable either way).
-- This is a column-level grant, NOT a blanket "grant update on profiles" —
-- users may only ever self-update these specific columns. credits, plan,
-- and the stripe_* fields are intentionally excluded and remain writable
-- only via the service-role client / SECURITY DEFINER RPCs.
grant update (display_name, brand_logo_path, brand_primary_color, brand_secondary_color)
  on public.profiles to authenticated;
