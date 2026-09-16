const OUTPUT_FILE = /^output(?:_\d{1,3})?\.(?:png|jpg|webp)$/;

/**
 * Storage paths that belong to one generation and may be deleted on its behalf.
 *
 * Paths are read from the generation row, so they are treated as untrusted: only
 * the exact shape persistGeneratedImages writes — `{userId}/{generationId}/output.ext`
 * or `output_N.ext` — is accepted. A prefix check alone would let
 * `{userId}/{generationId}/../../{otherUser}/...` through, and the caller deletes
 * with the service role, which ignores storage policies.
 */
export function ownedGenerationPaths(
  userId: string,
  generationId: string,
  outputPath: unknown,
  metadata: unknown
): string[] {
  const candidates: unknown[] = [outputPath];
  if (metadata && typeof metadata === "object" && Array.isArray((metadata as { output_paths?: unknown }).output_paths)) {
    candidates.push(...(metadata as { output_paths: unknown[] }).output_paths);
  }

  const owned = new Set<string>();
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const parts = candidate.split("/");
    if (parts.length !== 3) continue;
    const [owner, generation, file] = parts;
    if (owner !== userId || generation !== generationId || !OUTPUT_FILE.test(file)) continue;
    owned.add(candidate);
  }
  return [...owned];
}

const BRAND_LOGO_FILE = /^logo\.(?:png|webp)$/;

/**
 * The profile's brand logo path, or null unless it is exactly the file the brand
 * kit route writes: `{userId}/brand-kit/logo.png` or `.webp`. The logo is read
 * with the service role, so a path pointing into another user's folder would
 * otherwise stamp their logo onto this user's images.
 */
export function ownedBrandLogoPath(userId: string, path: unknown): string | null {
  if (typeof path !== "string") return null;
  const parts = path.split("/");
  if (parts.length !== 3) return null;
  const [owner, folder, file] = parts;
  return owner === userId && folder === "brand-kit" && BRAND_LOGO_FILE.test(file) ? path : null;
}

/** Every file the brand kit route may have written for a user, for replacing or removing the logo. */
export function brandLogoPaths(userId: string): string[] {
  return [`${userId}/brand-kit/logo.png`, `${userId}/brand-kit/logo.webp`];
}
