import { describe, expect, it } from "vitest";
import { UPSCALE_MAX_OUTPUT_EDGE } from "./plans";
import {
  GENERATION_UPLOAD_MAX_EDGE,
  MAX_IMAGE_REQUEST_BODY_CHARS,
  MAX_UPLOAD_DATA_URL_CHARS,
  dataUrlLength,
  fitWithin,
} from "./uploadLimits";

describe("fitWithin", () => {
  it("leaves an image that already fits unchanged", () => {
    expect(fitWithin(1200, 800, 2048)).toEqual({ width: 1200, height: 800 });
  });

  it("shrinks the longest edge to the limit and keeps the aspect ratio", () => {
    expect(fitWithin(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(3024, 4032, 2048)).toEqual({ width: 1536, height: 2048 });
  });

  it("never rounds a very thin image down to zero pixels", () => {
    expect(fitWithin(10000, 1, 2048)).toEqual({ width: 2048, height: 1 });
  });

  it("rejects dimensions that are not positive", () => {
    expect(() => fitWithin(0, 100, 2048)).toThrow(RangeError);
    expect(() => fitWithin(Number.NaN, 100, 2048)).toThrow(RangeError);
  });
});

describe("dataUrlLength", () => {
  it("matches what FileReader produces for base64", () => {
    const bytes = new Uint8Array(1000);
    const actual = `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`;
    expect(dataUrlLength(1000, "image/png")).toBe(actual.length);
  });

  it("shows why a 4 MB photo cannot be sent as it is", () => {
    // Base64 grows a file by a third, past what Vercel accepts in one request.
    expect(dataUrlLength(4 * 1024 * 1024, "image/jpeg")).toBeGreaterThan(MAX_UPLOAD_DATA_URL_CHARS);
  });
});

describe("limits", () => {
  it("keep a full-size upload and its JSON fields under Vercel's 4.5 MB body limit", () => {
    expect(MAX_UPLOAD_DATA_URL_CHARS).toBeLessThan(MAX_IMAGE_REQUEST_BODY_CHARS);
    expect(MAX_IMAGE_REQUEST_BODY_CHARS).toBeLessThan(4.5 * 1024 * 1024);
  });

  it("do not shrink an upscale source below what 2× can use", () => {
    expect(GENERATION_UPLOAD_MAX_EDGE).toBeGreaterThanOrEqual(UPSCALE_MAX_OUTPUT_EDGE / 2);
  });
});
