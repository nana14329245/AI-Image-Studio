import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { GenerationInputError } from "@/lib/imageGeneration";
import { planUpscale, type UpscalePlan } from "@/lib/plans";

/** A problem with the image the user supplied. The message is shown to them. */
export class UpscaleInputError extends GenerationInputError {}

const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
/** Guards against decompression bombs: a small file that decodes to a huge bitmap. */
const MAX_SOURCE_PIXELS = 100_000_000;
const FETCH_TIMEOUT_MS = 10_000;

const DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

/**
 * Whether an address is somewhere a public image link must never point.
 *
 * Fetching a user-supplied URL from the server lets that user make requests from
 * inside our network (SSRF). Loopback, private, link-local — which includes cloud
 * metadata at 169.254.169.254 — carrier-grade NAT, multicast and reserved ranges
 * are all refused, in both IPv4 and IPv6 form.
 */
export function isPrivateAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (family === 6) {
    const lower = address.toLowerCase();
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    return (
      lower === "::" ||
      lower === "::1" ||
      /^f[cd][0-9a-f]{2}:/.test(lower) || // fc00::/7 unique local
      /^fe[89ab][0-9a-f]:/.test(lower) || // fe80::/10 link local
      lower.startsWith("ff") // multicast
    );
  }
  return true; // not an IP at all: refuse rather than guess
}

async function readLimited(response: Response): Promise<Buffer> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_SOURCE_BYTES) {
    throw new UpscaleInputError("ไฟล์จากลิงก์ใหญ่เกิน 15 MB");
  }
  if (!response.body) throw new UpscaleInputError("ลิงก์นี้ไม่มีข้อมูลภาพ");

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new UpscaleInputError("ไฟล์จากลิงก์ใหญ่เกิน 15 MB");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/**
 * Downloads an image from a public HTTPS link without letting the link reach
 * internal addresses.
 *
 * Residual risk: the hostname is resolved and checked, then fetch resolves it
 * again, so a DNS server answering differently the second time (DNS rebinding)
 * could slip through. Redirects are refused outright so a public URL cannot
 * bounce to an internal one.
 */
async function fetchPublicImage(rawUrl: string): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UpscaleInputError("ลิงก์ภาพไม่ถูกต้อง");
  }
  if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443")) {
    throw new UpscaleInputError("กรุณาใช้ลิงก์ภาพที่ขึ้นต้นด้วย https://");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  let addresses: { address: string }[];
  try {
    addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new UpscaleInputError("เปิดลิงก์ภาพไม่ได้ กรุณาตรวจสอบลิงก์");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new UpscaleInputError("ลิงก์นี้ใช้ไม่ได้ กรุณาใช้ลิงก์ภาพจากเว็บไซต์สาธารณะ");
  }

  let response: Response;
  try {
    response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch {
    throw new UpscaleInputError("ดาวน์โหลดภาพจากลิงก์ไม่สำเร็จ กรุณาลองใหม่");
  }
  if (response.status >= 300 && response.status < 400) {
    throw new UpscaleInputError("ลิงก์นี้พาไปที่อื่น กรุณาใช้ลิงก์ของไฟล์ภาพโดยตรง");
  }
  if (!response.ok) throw new UpscaleInputError("ดาวน์โหลดภาพจากลิงก์ไม่สำเร็จ");
  if (!response.headers.get("content-type")?.startsWith("image/")) {
    throw new UpscaleInputError("ลิงก์นี้ไม่ใช่ไฟล์ภาพ");
  }
  return readLimited(response);
}

export type PreparedUpscaleSource = { image: Blob; plan: UpscalePlan };

/**
 * Loads the source from an uploaded data URL or a public link, then shrinks it so
 * the upscaled result stays within UPSCALE_MAX_OUTPUT_EDGE. The returned plan is
 * what gets charged, so the price always matches what fal.ai will actually do.
 */
export async function prepareUpscaleSource(imageUrl: string, scale: 2 | 4): Promise<PreparedUpscaleSource> {
  const dataUrl = imageUrl.match(DATA_URL);
  const bytes = dataUrl ? Buffer.from(dataUrl[1], "base64") : await fetchPublicImage(imageUrl);

  const sharp = (await import("sharp")).default;
  try {
    const source = sharp(bytes, { limitInputPixels: MAX_SOURCE_PIXELS });
    const { width, height, orientation } = await source.metadata();
    if (!width || !height) throw new Error("missing dimensions");

    // EXIF orientations 5-8 store the image on its side; rotate() below stands it
    // upright, so plan against the upright dimensions.
    const upright = orientation && orientation >= 5 ? { w: height, h: width } : { w: width, h: height };
    const plan = planUpscale(upright.w, upright.h, scale);

    // One decode: sharp shrinks JPEGs while loading when the target is smaller.
    const encoded = await source
      .rotate()
      .resize(plan.inputWidth, plan.inputHeight, { fit: "fill" })
      .jpeg({ quality: 95 })
      .toBuffer();

    return { image: new Blob([new Uint8Array(encoded)], { type: "image/jpeg" }), plan };
  } catch {
    throw new UpscaleInputError("อ่านไฟล์ภาพไม่ได้ หรือภาพใหญ่เกิน 100 ล้านพิกเซล");
  }
}
