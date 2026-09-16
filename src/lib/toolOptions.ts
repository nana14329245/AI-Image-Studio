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

/** Guards a value posted by the client against the list the UI actually offers. */
export function isAllowedOption(options: readonly ToolOption[], value: unknown): value is string {
  return typeof value === "string" && options.some((option) => option.value === value);
}
