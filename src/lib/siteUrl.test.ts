import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LOCAL_SITE_URL, getSiteUrl, isPubliclyHosted } from "./siteUrl";

const originalEnv = { ...process.env };

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SITE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("getSiteUrl", () => {
  it("falls back to localhost when nothing is configured", () => {
    expect(getSiteUrl()).toBe(LOCAL_SITE_URL);
    // robots.ts relies on this to refuse indexing of an unconfigured deployment.
    expect(isPubliclyHosted()).toBe(false);
  });

  it("uses the explicit site URL and strips a trailing slash", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://studio.example.com/";
    expect(getSiteUrl()).toBe("https://studio.example.com");
    expect(isPubliclyHosted()).toBe(true);
  });

  it("uses Vercel's production host, adding the scheme Vercel leaves off", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "ai-image-studio.vercel.app";
    expect(getSiteUrl()).toBe("https://ai-image-studio.vercel.app");
  });

  it("prefers the explicit URL over Vercel's, so a custom domain wins", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://studio.example.com";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "ai-image-studio.vercel.app";
    expect(getSiteUrl()).toBe("https://studio.example.com");
  });

  it("treats a blank value as unset rather than producing an empty origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "   ";
    expect(getSiteUrl()).toBe(LOCAL_SITE_URL);
  });
});
