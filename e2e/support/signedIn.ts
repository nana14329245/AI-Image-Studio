import { test as base, type Request } from "@playwright/test";
import { blockSpendingRequests } from "./mockApi";

/**
 * `test` for the signed-in projects. Every test starts with the spending guard
 * in place: generation, billing and brand-kit writes never reach the server, and
 * `blockedRequests` lists what the guard caught.
 */
export const test = base.extend<{ blockedRequests: Request[] }>({
  blockedRequests: [
    async ({ page }, use) => {
      await use(await blockSpendingRequests(page));
    },
    { auto: true },
  ],
});

export { expect } from "@playwright/test";
