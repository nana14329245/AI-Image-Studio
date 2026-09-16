import { createServiceRoleClient } from "@/lib/supabase/server";

export const GENERATIONS_BUCKET = "generations";

/**
 * How long a signed image link works. Long enough to finish looking at a result
 * or a gallery page; pages sign again on every load, and downloads go through
 * /api/generations/[id]/download, which does not depend on the link.
 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function generationsBucket() {
  return createServiceRoleClient().storage.from(GENERATIONS_BUCKET);
}

/**
 * Short-lived links for files in the private generations bucket, in the same
 * order as `paths`. Throws if Supabase cannot sign every one of them, so a page
 * never renders a result with a missing image.
 */
export async function signStoragePaths(paths: string[]): Promise<string[]> {
  if (paths.length === 0) return [];
  const { data, error } = await generationsBucket().createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (error) throw error;
  const byPath = new Map((data ?? []).map((entry) => [entry.path, entry.signedUrl]));
  return paths.map((path) => {
    const url = byPath.get(path);
    if (!url) throw new Error(`Unable to sign storage path ${path}`);
    return url;
  });
}
