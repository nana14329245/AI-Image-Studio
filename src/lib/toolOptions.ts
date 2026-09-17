/**
 * Choices offered by the image tools.
 *
 * `value` is the token the API route splices into the fal.ai prompt, so it stays
 * in English and must not be translated — the models respond to these words.
 * `label` is what the shop owner reads, and is free to change.
 *
 * Both the client pages and the API routes read these lists, so a choice cannot
 * exist in the UI without also passing server-side validation.
 */
export type ToolOption = { value: string; label: string };

export const PRODUCT_STYLES: readonly ToolOption[] = [
  { value: "Clean", label: "เรียบสะอาด" },
  { value: "Minimal", label: "มินิมอล" },
  { value: "Luxury", label: "หรูหรา" },
  { value: "Home / Lifestyle", label: "ของใช้ในบ้าน" },
  { value: "Natural", label: "แสงธรรมชาติ" },
  { value: "Marketplace", label: "สไตล์มาร์เก็ตเพลส" },
];

export const PRODUCT_BACKGROUNDS: readonly ToolOption[] = [
  { value: "Studio", label: "สตูดิโอ" },
  { value: "Bathroom", label: "ห้องน้ำ" },
  { value: "Living Room", label: "ห้องนั่งเล่น" },
  { value: "Nature", label: "ธรรมชาติ" },
  { value: "Luxury", label: "พื้นหลังหรู" },
  { value: "Marketplace White", label: "พื้นขาวมาร์เก็ตเพลส" },
];

/** Platform names are proper nouns and stay as they are. */
export const AD_PLATFORMS: readonly ToolOption[] = [
  { value: "Facebook", label: "Facebook" },
  { value: "Instagram", label: "Instagram" },
  { value: "Shopee", label: "Shopee" },
  { value: "Lazada", label: "Lazada" },
  { value: "TikTok", label: "TikTok" },
];

export const AD_FORMATS: readonly ToolOption[] = [
  { value: "1:1", label: "1:1 จัตุรัส" },
  { value: "4:5", label: "4:5 แนวตั้ง" },
  { value: "16:9", label: "16:9 แนวนอน" },
  { value: "9:16", label: "9:16 สตอรี่" },
];

export const PORTRAIT_CAREERS: readonly ToolOption[] = [
  { value: "Office", label: "พนักงานออฟฟิศ" },
  { value: "IT", label: "สายไอที" },
  { value: "Banking", label: "ธนาคาร / การเงิน" },
  { value: "Hotel", label: "โรงแรม / งานบริการ" },
  { value: "Sales", label: "ฝ่ายขาย" },
  { value: "Student", label: "นักเรียน / นักศึกษา" },
];

export const PORTRAIT_BACKGROUNDS: readonly ToolOption[] = [
  { value: "White", label: "พื้นขาว" },
  { value: "Gray", label: "พื้นเทา" },
  { value: "Blue", label: "พื้นน้ำเงิน" },
  { value: "Office", label: "ฉากออฟฟิศ" },
];

export const PORTRAIT_SIZES: readonly ToolOption[] = [
  { value: "Resume", label: "ติดเรซูเม่" },
  { value: "1 × 1", label: "1 × 1 นิ้ว" },
  { value: "Passport", label: "รูปพาสปอร์ต" },
];

/**
 * Flat hex color behind each solid PORTRAIT_BACKGROUNDS choice. "Office" has no
 * entry on purpose: it is a photographic scene, not a color, and only makes
 * sense when an AI model repaints the background — which the Passport and
 * 1 × 1 sizes never do (see PORTRAIT_SIZES_WITH_LOCKED_FACE below).
 */
export const PORTRAIT_BACKGROUND_HEX: Readonly<Record<string, string>> = {
  White: "#ffffff",
  Gray: "#d9d9d9",
  Blue: "#3b6fa0",
};

/**
 * Sizes where the face must not be touched at all — an ID-style photo where a
 * generated face would be a different person for an official purpose. These
 * sizes skip the generative model entirely: only the background is replaced
 * (with a flat color from PORTRAIT_BACKGROUND_HEX) and the result is cropped
 * to size, so "Office" is not a valid choice for them.
 */
export const PORTRAIT_SIZES_WITH_LOCKED_FACE: ReadonlySet<string> = new Set(["Passport", "1 × 1"]);

/** Backgrounds valid for a given size — excludes "Office" once the face is locked. */
export function portraitBackgroundsForSize(size: string): readonly ToolOption[] {
  if (!PORTRAIT_SIZES_WITH_LOCKED_FACE.has(size)) return PORTRAIT_BACKGROUNDS;
  return PORTRAIT_BACKGROUNDS.filter((option) => option.value in PORTRAIT_BACKGROUND_HEX);
}

/** Guards a value posted by the client against the list the UI actually offers. */
export function isAllowedOption(options: readonly ToolOption[], value: unknown): value is string {
  return typeof value === "string" && options.some((option) => option.value === value);
}
