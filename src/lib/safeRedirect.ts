export const DEFAULT_AFTER_LOGIN = "/dashboard";

const PLACEHOLDER_ORIGIN = "https://placeholder.invalid";

/**
 * The `next` parameter as a same-site path, or the dashboard.
 *
 * `next` arrives in links anyone can craft, and it is used after sign-in, so an
 * unchecked value makes the login page an open redirect: a phishing link to the
 * real site that lands on another one once the victim has signed in. Only a
 * single leading slash followed by a path is accepted. `//host` and `/\host` are
 * refused because browsers read them as another origin, and `@host` because
 * `${origin}${next}` would turn it into user info in front of a foreign host.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return DEFAULT_AFTER_LOGIN;
  }
  // URL parsers strip tabs and newlines, which can rebuild a `//` prefix.
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f) return DEFAULT_AFTER_LOGIN;
  }
  try {
    const resolved = new URL(value, PLACEHOLDER_ORIGIN);
    if (resolved.origin !== PLACEHOLDER_ORIGIN) return DEFAULT_AFTER_LOGIN;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
}
