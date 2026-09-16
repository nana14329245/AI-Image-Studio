import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getSupabaseConfig, requireSupabaseConfig } from "./config";

const originalEnv = { ...process.env };

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("getSupabaseConfig", () => {
  it("reads a configured project and trims stray whitespace", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "  https://abc.supabase.co  ";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "  sb_publishable_abc123  ";

    expect(getSupabaseConfig()).toEqual({
      url: "https://abc.supabase.co",
      key: "sb_publishable_abc123",
    });
  });

  it("prefers the publishable key over the legacy anon key", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_new";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy_anon";

    expect(getSupabaseConfig()?.key).toBe("sb_publishable_new");
  });

  it("still accepts the legacy anon key on its own", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "legacy_anon";

    expect(getSupabaseConfig()?.key).toBe("legacy_anon");
  });

  it("refuses a secret key in the browser-exposed slot", () => {
    // NEXT_PUBLIC_ values are inlined into the client bundle; a secret key
    // reaching this slot would be published to every visitor.
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_secret_do_not_ship";

    expect(getSupabaseConfig()).toBeNull();
  });

  it("treats untouched placeholder values as unconfigured", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://your-project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "your-anon-key";

    expect(getSupabaseConfig()).toBeNull();
  });

  it("rejects a url that is not http(s) or not a url at all", () => {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_abc123";

    process.env.NEXT_PUBLIC_SUPABASE_URL = "ftp://abc.supabase.co";
    expect(getSupabaseConfig()).toBeNull();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "not-a-url";
    expect(getSupabaseConfig()).toBeNull();
  });

  it("returns null when either half is missing or blank", () => {
    expect(getSupabaseConfig()).toBeNull();

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    expect(getSupabaseConfig()).toBeNull();

    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "   ";
    expect(getSupabaseConfig()).toBeNull();
  });
});

describe("requireSupabaseConfig", () => {
  it("returns the config when the project is set up", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_abc123";

    expect(requireSupabaseConfig().url).toBe("https://abc.supabase.co");
  });

  it("throws a message pointing at the setup page when it is not", () => {
    expect(() => requireSupabaseConfig()).toThrow(/\/setup/);
  });
});
