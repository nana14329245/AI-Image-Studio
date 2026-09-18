import { describe, expect, it } from "vitest";
import { wrapText } from "./adOverlay";

describe("wrapText", () => {
  it("keeps short text on one line", () => {
    expect(wrapText("กระเป๋าหนังแท้", 60, 950, 2)).toEqual(["กระเป๋าหนังแท้"]);
  });

  it("wraps at word boundaries when a space-separated word would overflow", () => {
    const lines = wrapText("สินค้าคุณภาพ พร้อมส่งทั่วประเทศไทยวันนี้เท่านั้น", 60, 300, 3);
    expect(lines.length).toBeGreaterThan(1);
    // Every line stays within the budget the width/font size imply — measured
    // in user-perceived characters (graphemes), not UTF-16 code units, since a
    // Thai tone mark or vowel sign is a separate code unit but not a separate
    // visual character.
    const charsPerLine = Math.floor(300 / (60 * 0.62));
    for (const line of lines) {
      const graphemeCount = [...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(line)].length;
      expect(graphemeCount).toBeLessThanOrEqual(charsPerLine);
    }
  });

  it("never separates a Thai tone mark or vowel sign from its base consonant when hard-breaking a long run", () => {
    // "ทุกวัน" contains ั (SARA A, a combining vowel sign) after ว — a naive
    // UTF-16 slice here has historically cut between them, leaving a floating
    // mark with nothing to attach to.
    const lines = wrapText("สินค้าคุณภาพสำหรับทุกวันทุกเวลาไม่มีข้อยกเว้นใดๆทั้งสิ้น", 60, 300, 3);
    for (const line of lines) {
      // A line must not start with a combining mark: every one has a base
      // character to its left, either earlier on the same line or the mark
      // would have moved there with it.
      expect(line.length).toBeGreaterThan(0);
      expect(/^[ัิ-ฺ็-๎]/.test(line)).toBe(false);
    }
  });

  it("truncates with an ellipsis instead of silently dropping text past the line cap", () => {
    const lines = wrapText("หนึ่งสองสามสี่ห้าหกเจ็ดแปดเก้าสิบสิบเอ็ดสิบสองสิบสามสิบสี่สิบห้า", 60, 200, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1].endsWith("…")).toBe(true);
  });

  it("wraps mixed Thai, Latin and digits without throwing", () => {
    const lines = wrapText("Serum Vitamin C 30ml สูตรใหม่ 2026", 60, 700, 2);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.join(" ")).toContain("Serum");
  });
});
