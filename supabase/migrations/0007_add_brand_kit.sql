-- Brand Kit: per-user logo + brand colors, applied to generated images.
-- Logo file itself lives in the existing "generations" Storage bucket at
-- "{userId}/brand-kit/logo.<ext>"; this migration only adds the profile columns.
alter table public.profiles
  add column if not exists brand_logo_path text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_secondary_color text;
