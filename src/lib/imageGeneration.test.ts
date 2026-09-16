import { describe, expect, it } from "vitest";
import { extractResultUrls, isSupportedImageDataUrl } from "./imageGeneration";

describe("isSupportedImageDataUrl", () => {
  it("accepts the three formats the upload UI offers", () => {
    expect(isSupportedImageDataUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(true);
    expect(isSupportedImageDataUrl("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).toBe(true);
    expect(isSupportedImageDataUrl("data:image/webp;base64,UklGRiQAAABXRUJQ")).toBe(true);
  });

  it("rejects image types that can carry scripts", () => {
    // SVG is an image type but executes embedded script when rendered.
    expect(isSupportedImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=")).toBe(false);
    expect(isSupportedImageDataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(isSupportedImageDataUrl("data:application/json;base64,e30=")).toBe(false);
  });

  it("rejects remote URLs, which must not reach the provider as an uploaded file", () => {
    expect(isSupportedImageDataUrl("https://example.com/photo.png")).toBe(false);
    expect(isSupportedImageDataUrl("file:///etc/passwd")).toBe(false);
  });

  it("rejects malformed or non-string payloads", () => {
    expect(isSupportedImageDataUrl("data:image/png;base64,")).toBe(false);
    expect(isSupportedImageDataUrl("data:image/png,notbase64")).toBe(false);
    expect(isSupportedImageDataUrl("data:image/png;base64,has spaces==")).toBe(false);
    expect(isSupportedImageDataUrl(null)).toBe(false);
    expect(isSupportedImageDataUrl(undefined)).toBe(false);
    expect(isSupportedImageDataUrl(123)).toBe(false);
    expect(isSupportedImageDataUrl({})).toBe(false);
  });
});

describe("extractResultUrls", () => {
  it("reads every url from a multi-image provider response", () => {
    const data = { images: [{ url: "https://cdn.fal.ai/a.png" }, { url: "https://cdn.fal.ai/b.png" }] };
    expect(extractResultUrls(data)).toEqual(["https://cdn.fal.ai/a.png", "https://cdn.fal.ai/b.png"]);
  });

  it("falls back to the single-image shape when there is no images array", () => {
    expect(extractResultUrls({ image: { url: "https://cdn.fal.ai/one.png" } })).toEqual([
      "https://cdn.fal.ai/one.png",
    ]);
  });

  it("prefers the images array and ignores the single image when both are present", () => {
    const data = {
      images: [{ url: "https://cdn.fal.ai/from-array.png" }],
      image: { url: "https://cdn.fal.ai/from-single.png" },
    };
    expect(extractResultUrls(data)).toEqual(["https://cdn.fal.ai/from-array.png"]);
  });

  it("drops non-https urls so a downgraded or local address is never stored", () => {
    const data = {
      images: [
        { url: "http://cdn.fal.ai/insecure.png" },
        { url: "https://cdn.fal.ai/secure.png" },
        { url: "file:///tmp/local.png" },
      ],
    };
    expect(extractResultUrls(data)).toEqual(["https://cdn.fal.ai/secure.png"]);
  });

  it("returns an empty list for anything unexpected instead of throwing", () => {
    expect(extractResultUrls(null)).toEqual([]);
    expect(extractResultUrls(undefined)).toEqual([]);
    expect(extractResultUrls("a string")).toEqual([]);
    expect(extractResultUrls({})).toEqual([]);
    expect(extractResultUrls({ images: [] })).toEqual([]);
    expect(extractResultUrls({ images: [{ url: 42 }] })).toEqual([]);
    expect(extractResultUrls({ image: {} })).toEqual([]);
  });
});
