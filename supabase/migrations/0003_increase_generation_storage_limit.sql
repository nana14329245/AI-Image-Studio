-- Allow durable storage of large 4x upscales on Supabase Free projects.
update storage.buckets
set file_size_limit = 52428800
where id = 'generations';
