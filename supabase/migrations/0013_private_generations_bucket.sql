-- Generated images and brand logos are private.
--
-- The generations bucket was public and its read policy allowed listing, so
-- anyone with the project URL could enumerate and download every user's
-- images, including portraits of real faces. The app now reads the bucket
-- only through the service role and hands browsers short-lived signed URLs.

update storage.buckets set public = false where id = 'generations';

-- No end-user policies remain on this bucket: every read, upload and delete
-- goes through a server route using the service role. The own-folder insert and
-- delete policies let any signed-in user upload arbitrary files straight to storage and were
-- never used by the app.
drop policy if exists "generations_bucket_read" on storage.objects;
drop policy if exists "generations_bucket_insert_own" on storage.objects;
drop policy if exists "generations_bucket_delete_own" on storage.objects;

-- The brand kit route writes brand_logo_path with the service role after
-- validating the file. Users keep update rights on their name and colours only,
-- so they cannot point the path at a file the route did not write.
revoke update (brand_logo_path) on public.profiles from authenticated;

-- Public URLs saved before this migration no longer work. Rows that have a
-- storage path are served by signing that path, so drop the dead URLs.
-- Rows without a path keep output_url: it is the provider's own link.
update public.generations
set
  output_url = case
    when output_url like '%/storage/v1/object/public/generations/%' then null
    else output_url
  end,
  generation_metadata = generation_metadata - 'results'
where output_path is not null;
