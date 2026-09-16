/**
 * Upload limits shared by the tool pages (which shrink images before sending)
 * and the API routes (which reject anything larger).
 *
 * Vercel rejects a serverless request body over 4.5 MB before the route runs,
 * with a platform error the user cannot act on. Images are sent as base64 data
 * URLs inside JSON, so the browser re-encodes anything that would not fit
 * comfortably under that.
 */

/** Longest data URL a page will send. Leaves room for the other JSON fields. */
export const MAX_UPLOAD_DATA_URL_CHARS = 3_500_000;

/** Request body limit enforced by the image API routes; just under Vercel's 4.5 MB. */
export const MAX_IMAGE_REQUEST_BODY_CHARS = 4_000_000;

/**
 * Largest file a visitor may pick. Phone photos are often 5–12 MB; they are
 * shrunk in the browser, so this only guards against decoding something absurd.
 */
export const MAX_SOURCE_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_SOURCE_FILE_MB = MAX_SOURCE_FILE_BYTES / (1024 * 1024);

/** Largest image the browser will decode, matching the server's upscale guard. */
export const MAX_SOURCE_PIXELS = 100_000_000;

/**
 * Longest edge sent for the generation tools. flux-pro/kontext works at about
 * 1 megapixel, so more resolution only adds upload time.
 */
export const GENERATION_UPLOAD_MAX_EDGE = 2048;

/** Width and height that fit within `maxEdge` on the longest side, keeping the aspect ratio. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (!(width > 0 && height > 0 && maxEdge > 0)) throw new RangeError("dimensions must be positive");
  const ratio = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/** Length of the base64 data URL a file of `bytes` becomes, for a given MIME type. */
export function dataUrlLength(bytes: number, mimeType: string): number {
  return `data:${mimeType};base64,`.length + Math.ceil(bytes / 3) * 4;
}
