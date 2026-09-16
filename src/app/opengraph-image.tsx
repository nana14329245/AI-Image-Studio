import { ImageResponse } from "next/og";
import { SIGNUP_CREDITS } from "@/lib/plans";

export const alt = "AI Image Studio — ภาพสินค้ามืออาชีพสำหรับผู้ขายออนไลน์";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Rendered rather than shipped as a file so the card cannot drift from the brand
 * when colours change. Latin-only text: the default font in this renderer has no
 * Thai glyphs, and loading one would mean bundling a font file for a preview card.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f2f2ed",
          color: "#14140f",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", fontSize: 40, fontWeight: 800, letterSpacing: -2 }}>
          AI<span style={{ color: "#e2542c", margin: "0 10px" }}>/</span>IMAGE
          <span style={{ fontSize: 16, marginLeft: 14, letterSpacing: 2, alignSelf: "flex-start", marginTop: 6 }}>
            STUDIO
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3, display: "flex" }}>
            Product photos that
          </div>
          <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, letterSpacing: -3, display: "flex" }}>
            are ready to sell<span style={{ color: "#e2542c" }}>.</span>
          </div>
          <div style={{ fontSize: 28, color: "#5b5b52", marginTop: 28, display: "flex" }}>
            4K upscale · product angles · ad creative · professional headshots
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 20,
            color: "#5b5b52",
            borderTop: "2px solid #14140f",
            paddingTop: 22,
          }}
        >
          <span>For sellers on Shopee, Lazada and TikTok Shop</span>
          <span>Start free — {SIGNUP_CREDITS} credits</span>
        </div>
      </div>
    ),
    size
  );
}
