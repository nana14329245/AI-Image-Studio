import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Burns the ad copy (headline, benefit, CTA) into the generated image as real
 * Thai text, instead of leaving the image bare and showing the copy only
 * beside it in the UI. The model itself is never asked to render text — every
 * image-editing model here does Thai glyphs badly — this composites real
 * text with a real font on top, server-side, after generation.
 */

export type AdCopy = { headline: string; benefit: string; cta: string };

const FONT_PATH = path.join(process.cwd(), "public", "fonts", "Kanit-Bold.ttf");
let cachedFontBase64: string | null = null;

async function fontBase64(): Promise<string> {
  if (!cachedFontBase64) {
    cachedFontBase64 = (await readFile(FONT_PATH)).toString("base64");
  }
  return cachedFontBase64;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Splits into user-perceived characters, not UTF-16 code units — a Thai tone
 * mark or vowel sign is its own code unit stacked on the base consonant, and
 * slicing between them orphans a floating mark with nothing to attach to.
 */
function graphemes(text: string): string[] {
  return Array.from(new Intl.Segmenter("th", { granularity: "grapheme" }).segment(text), (s) => s.segment);
}

/**
 * Greedy word-wrap by estimated glyph width (Kanit Bold averages close to
 * 0.62× font-size per character across Thai and Latin). Not exact — SVG has
 * no text-measurement API without a real layout engine — but close enough for
 * a marketing overlay. Wraps the whole string with no line limit; wrapText
 * below caps it and adds the ellipsis.
 */
function wrapAllLines(text: string, charsPerLine: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  const flush = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (graphemes(candidate).length <= charsPerLine) {
      current = candidate;
      continue;
    }
    flush();
    const wordGraphemes = graphemes(word);
    if (wordGraphemes.length <= charsPerLine) {
      current = word;
      continue;
    }
    // A single "word" longer than a full line (common in Thai, which has no
    // spaces between words) is hard-broken at grapheme boundaries.
    for (let i = 0; i < wordGraphemes.length; i += charsPerLine) {
      lines.push(wordGraphemes.slice(i, i + charsPerLine).join(""));
    }
  }
  flush();
  return lines;
}

export function wrapText(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const charsPerLine = Math.max(4, Math.floor(maxWidth / (fontSize * 0.62)));
  const allLines = wrapAllLines(text, charsPerLine);
  if (allLines.length <= maxLines) return allLines;

  const lines = allLines.slice(0, maxLines);
  const lastGraphemes = graphemes(lines[maxLines - 1]);
  lastGraphemes[lastGraphemes.length - 1] = "…";
  lines[maxLines - 1] = lastGraphemes.join("");
  return lines;
}

function tspanLines(lines: string[], x: number, startY: number, lineHeight: number): string {
  return lines
    .map((line, i) => `<tspan x="${x}" y="${startY + i * lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");
}

export async function renderAdCopyOverlay(
  image: Blob,
  copy: AdCopy,
  accentHex: string
): Promise<Blob> {
  const sharp = (await import("sharp")).default;
  const buffer = Buffer.from(await image.arrayBuffer());
  const source = sharp(buffer);
  const { width, height } = await source.metadata();
  if (!width || !height) throw new Error("Unable to read image dimensions");

  const font = await fontBase64();
  const padding = Math.round(width * 0.06);
  const contentWidth = width - padding * 2;

  const headlineSize = Math.round(width * 0.062);
  const benefitSize = Math.round(width * 0.034);
  const ctaSize = Math.round(width * 0.03);

  const headlineLines = wrapText(copy.headline, headlineSize, contentWidth, 2);
  const benefitLines = wrapText(copy.benefit, benefitSize, contentWidth, 2);

  const ctaWidth = Math.round(copy.cta.length * ctaSize * 0.62) + Math.round(ctaSize * 2.4);
  const ctaHeight = Math.round(ctaSize * 2.2);

  // Bottom-anchored block: CTA pill, then benefit lines above it, then the
  // headline above that — each measured from the bottom so the block grows
  // upward regardless of how many lines wrapping produced.
  const ctaBottom = height - padding;
  const ctaTop = ctaBottom - ctaHeight;
  const benefitLineHeight = Math.round(benefitSize * 1.35);
  const benefitBottom = ctaTop - Math.round(padding * 0.6);
  const benefitTop = benefitBottom - (benefitLines.length - 1) * benefitLineHeight;
  const headlineLineHeight = Math.round(headlineSize * 1.2);
  const headlineBottom = benefitTop - benefitSize - Math.round(padding * 0.5);
  const gradientTop = Math.max(0, headlineBottom - headlineLines.length * headlineLineHeight - padding);

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <style>
          @font-face {
            font-family: 'AdOverlay';
            src: url(data:font/truetype;base64,${font}) format('truetype');
            font-weight: 700;
          }
          text { font-family: 'AdOverlay', sans-serif; font-weight: 700; fill: #ffffff; }
        </style>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#000000" stop-opacity="0" />
          <stop offset="1" stop-color="#000000" stop-opacity="0.78" />
        </linearGradient>
      </defs>
      <rect x="0" y="${gradientTop}" width="${width}" height="${height - gradientTop}" fill="url(#fade)" />
      <text x="${padding}" y="${headlineBottom}" font-size="${headlineSize}" style="paint-order: stroke; stroke: rgba(0,0,0,0.35); stroke-width: ${Math.max(1, Math.round(headlineSize * 0.03))}">
        ${tspanLines(headlineLines, padding, headlineBottom - (headlineLines.length - 1) * headlineLineHeight, headlineLineHeight)}
      </text>
      <text x="${padding}" y="${benefitTop}" font-size="${benefitSize}" fill-opacity="0.92">
        ${tspanLines(benefitLines, padding, benefitTop, benefitLineHeight)}
      </text>
      <rect x="${padding}" y="${ctaTop}" width="${ctaWidth}" height="${ctaHeight}" rx="${Math.round(ctaHeight / 2)}" fill="${accentHex}" />
      <text x="${padding + ctaWidth / 2}" y="${ctaTop + ctaHeight * 0.67}" font-size="${ctaSize}" text-anchor="middle">${escapeXml(copy.cta)}</text>
    </svg>
  `;

  const composited = await sharp(buffer)
    .composite([{ input: Buffer.from(svg) }])
    .jpeg({ quality: 92 })
    .toBuffer();

  return new Blob([new Uint8Array(composited)], { type: "image/jpeg" });
}
