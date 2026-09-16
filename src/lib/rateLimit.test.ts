import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { getClientIp } from "./rateLimit";

function requestWith(headers: Record<string, string>): NextRequest {
  return { headers: new Headers(headers) } as NextRequest;
}

describe("getClientIp", () => {
  it("takes the client address from x-forwarded-for", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("takes the first hop when proxies have appended their own addresses", () => {
    // Later entries are the proxies themselves; rate limiting must key on the client.
    expect(
      getClientIp(requestWith({ "x-forwarded-for": "203.0.113.7, 70.41.3.18, 150.172.238.178" }))
    ).toBe("203.0.113.7");
  });

  it("trims whitespace around the address", () => {
    expect(getClientIp(requestWith({ "x-forwarded-for": "  203.0.113.7  , 70.41.3.18" }))).toBe(
      "203.0.113.7"
    );
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(getClientIp(requestWith({ "x-real-ip": "198.51.100.42" }))).toBe("198.51.100.42");
  });

  it("prefers x-forwarded-for over x-real-ip when both are set", () => {
    expect(
      getClientIp(requestWith({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.42" }))
    ).toBe("203.0.113.7");
  });

  it("returns a constant bucket rather than undefined when no address is present", () => {
    // Returning undefined would make every anonymous caller its own bucket.
    expect(getClientIp(requestWith({}))).toBe("unknown");
  });
});
