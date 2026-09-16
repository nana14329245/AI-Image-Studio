-- Generation rows are written only by the server.
--
-- 0001 let a signed-in user update any column of their own generation rows. The
-- delete route reads output_paths from that row and removes the files with the
-- service role, so a user could rewrite output_paths to point at another user's
-- images and have them deleted. The same freedom let fal_request_ids be pointed at
-- someone else's queued job.
--
-- All updates now go through the service role in src/lib/imageGeneration.ts.
-- Users keep select, insert and delete on their own rows.
--
-- Apply this only after the code that stops using the user session for updates
-- is running, or in-flight generations will fail to record their results.

drop policy if exists "generations_update_own" on public.generations;
