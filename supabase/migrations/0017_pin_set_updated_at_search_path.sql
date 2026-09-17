-- Pins search_path on the one function the security advisor still flagged.
-- Low risk on its own (a plain "before update" trigger with no user input,
-- referencing only NEW/OLD), but every other function in this schema already
-- pins search_path, so this closes the one exception rather than leaving a
-- precedent for future trigger functions to skip it.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path to ''
as $$
begin new.updated_at = now(); return new; end;
$$;
