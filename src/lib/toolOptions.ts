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

/**
 * Four concrete scene descriptions per PRODUCT_BACKGROUNDS choice, one per
 * generated angle, so Product Studio's 4 results are 4 different scenes
 * instead of the same background phrase repeated in every prompt. Each list
 * stays within the chosen category (a "Studio" pick should not surprise
 * someone with a kitchen counter) but varies the concrete setting, prop, and
 * light within it.
 */
export const PRODUCT_SCENE_VARIANTS: Readonly<Record<string, readonly [string, string, string, string]>> = {
  Studio: [
    "a seamless white studio backdrop with soft, even lighting",
    "a seamless light gray studio backdrop with a gentle gradient and soft shadow beneath the product",
    "a dark charcoal studio backdrop with dramatic rim lighting outlining the product",
    "a studio backdrop with a subtle warm-toned colored gel light accent in the background",
  ],
  Bathroom: [
    "a bright bathroom countertop beside a sink, with a folded white towel nearby",
    "a marble bathroom vanity with soft natural window light",
    "a bathroom shelf styled with a small plant and a candle beside the product",
    "a bathtub edge with water droplets and steam suggesting a spa moment",
  ],
  "Living Room": [
    "a wooden coffee table in a bright living room with a sofa softly out of focus behind it",
    "a windowsill in a living room with warm afternoon light and sheer curtains",
    "a bookshelf styled with a small plant and a stack of books beside the product",
    "a side table next to a reading chair with a cozy throw blanket in the background",
  ],
  Nature: [
    "a flat stone surface outdoors with soft natural daylight and greenery blurred behind it",
    "a wooden picnic table in dappled sunlight beneath tree leaves",
    "a mossy log or garden ledge with a shallow depth of field",
    "a sunlit windowsill with a view of a garden, morning light streaming in",
  ],
  Luxury: [
    "a polished dark marble surface with a single soft spotlight",
    "a brushed gold tray on a velvet backdrop",
    "a glass surface with a subtle reflection and moody, elegant lighting",
    "a satin fabric backdrop with warm, low-key lighting for a premium feel",
  ],
  "Marketplace White": [
    "a pure white seamless background, centered, even shadowless lighting",
    "a pure white seamless background with a soft drop shadow directly beneath the product",
    "a pure white seamless background, product angled slightly with a light gradient shadow",
    "a pure white seamless background with crisp, bright, catalog-style lighting",
  ],
};

/** The scene phrase for one of the 4 Product Studio angle prompts (index 0-3). */
export function productSceneVariant(background: string, index: number): string {
  const variants = PRODUCT_SCENE_VARIANTS[background];
  return variants ? variants[index % variants.length] : background;
}

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
