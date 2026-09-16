/**
 * Absolute base URL for metadata that cannot be relative — Open Graph images,
 * the sitemap, canonical links.
 *
 * Read from the environment because the project has no fixed domain yet. Vercel
 * sets VERCEL_PROJECT_PRODUCTION_URL on its own; NEXT_PUBLIC_SITE_URL overrides
 * it for any other host. The localhost fallback keeps local builds working and
 * is the reason robots.ts refuses to allow indexing unless a real URL is set.
 */
export const LOCAL_SITE_URL = "http://localhost:3000";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return LOCAL_SITE_URL;
}

/** Whether the site is reachable at a real public address rather than localhost. */
export function isPubliclyHosted(): boolean {
  return getSiteUrl() !== LOCAL_SITE_URL;
}
