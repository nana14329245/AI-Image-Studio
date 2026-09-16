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
