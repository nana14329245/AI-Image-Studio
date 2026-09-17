import path from "node:path";

// Loads .env.local so a local run sees E2E_EMAIL / E2E_PASSWORD without exporting
// them in the shell. Values already in the environment (CI) win.
try {
  process.loadEnvFile(path.join(__dirname, "..", "..", ".env.local"));
} catch {
  // No .env.local: CI, or a fresh clone. The public tests need nothing from it.
}

/** Where the signed-in browser state is saved. Git-ignored: it holds a live session. */
export const AUTH_STATE_FILE = path.join(__dirname, "..", ".auth", "user.json");

export function hasTestUser(): boolean {
  return Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
}

/**
 * Set when the server under test was built with a PostHog key, so the consent
 * banner should appear. CI builds with a dummy key pointed at an unreachable host.
 */
export function expectsAnalyticsBanner(): boolean {
  return process.env.E2E_EXPECT_ANALYTICS === "1";
}
