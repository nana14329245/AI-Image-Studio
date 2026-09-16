import { describe, expect, it } from "vitest";
import { CONSENT_VERSION, parseConsent, serializeConsent } from "./consent";

describe("parseConsent", () => {
  it("reads back both choices it writes", () => {
    expect(parseConsent(serializeConsent("granted"))).toBe("granted");
    expect(parseConsent(serializeConsent("denied"))).toBe("denied");
  });

  it("treats no stored value as undecided, so analytics stays off", () => {
    expect(parseConsent(null)).toBeNull();
    expect(parseConsent("")).toBeNull();
  });

  it("asks again after the consent version changes", () => {
    const old = JSON.stringify({ version: CONSENT_VERSION - 1, choice: "granted" });
    expect(parseConsent(old)).toBeNull();
  });

  it("ignores malformed or unexpected values instead of treating them as consent", () => {
    expect(parseConsent("granted")).toBeNull();
    expect(parseConsent("{not json")).toBeNull();
    expect(parseConsent(JSON.stringify({ version: CONSENT_VERSION, choice: "yes" }))).toBeNull();
    expect(parseConsent(JSON.stringify({ version: CONSENT_VERSION }))).toBeNull();
  });
});
