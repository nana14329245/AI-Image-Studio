import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_LOGIN, safeNextPath } from "./safeRedirect";

describe("safeNextPath", () => {
  it("keeps a path on this site, with its query", () => {
    expect(safeNextPath("/gallery")).toBe("/gallery");
    expect(safeNextPath("/reset-password")).toBe("/reset-password");
    expect(safeNextPath("/gallery?tool=product")).toBe("/gallery?tool=product");
  });

  it("falls back to the dashboard when there is no value", () => {
    expect(safeNextPath(null)).toBe(DEFAULT_AFTER_LOGIN);
    expect(safeNextPath("")).toBe(DEFAULT_AFTER_LOGIN);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "@evil.example",
    "evil.example",
    "javascript:alert(1)",
    `/${String.fromCharCode(9)}/evil.example`,
    `/${String.fromCharCode(10)}/evil.example`,
  ])("refuses %j, which would leave the site", (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_LOGIN);
  });
});
