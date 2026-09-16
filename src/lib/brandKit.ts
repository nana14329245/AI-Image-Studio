import type { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

export type BrandKit = {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

export async function getBrandKit(supabase: SupabaseServerClient, userId: string): Promise<BrandKit> {
  const { data } = await supabase
    .from("profiles")
    .select("brand_logo_path, brand_primary_color, brand_secondary_color")
    .eq("id", userId)
    .single();

  const logoPath = data?.brand_logo_path ?? null;
  const logoUrl = logoPath
    ? createServiceRoleClient().storage.from("generations").getPublicUrl(logoPath).data.publicUrl
    : null;

  return {
    logoUrl,
    primaryColor: data?.brand_primary_color ?? null,
    secondaryColor: data?.brand_secondary_color ?? null,
  };
}

export function brandColorPromptHint(kit: BrandKit): string | null {
  if (!kit.primaryColor) return null;
  const colors = kit.secondaryColor ? `${kit.primaryColor} and ${kit.secondaryColor}` : kit.primaryColor;
  return `Subtly incorporate the brand color${kit.secondaryColor ? "s" : ""} ${colors} into the background, props, or lighting mood — not as literal text or a rendered logo.`;
}

/**
 * Whether the logo has any see-through pixels.
 *
 * The logo is composited straight onto the generated image, so one with no
 * transparency lands as a solid rectangle over the product. The check is on the
 * pixels rather than the file type on purpose: a JPEG can never be transparent,
 * but a PNG exported on a white background is just as opaque and looks identical
 * to the user until they see the result.
 */
export async function logoHasTransparency(image: Blob): Promise<boolean> {
  const sharp = (await import("sharp")).default;
  const buffer = Buffer.from(await image.arrayBuffer());
  const { isOpaque } = await sharp(buffer).stats();
  return !isOpaque;
}

/**
 * Composites `logoUrl` onto the bottom-right corner of `image` (~3% padding,
 * logo resized to ~14% of the base image's width) and returns a PNG blob.
 * Throws on any failure — callers must catch and fall back to the original
 * un-overlaid image, never let this break generation.
 */
export async function overlayBrandLogo(image: Blob, logoUrl: string): Promise<Blob> {
  const sharp = (await import("sharp")).default;

  const [baseBuffer, logoResponse] = await Promise.all([
    image.arrayBuffer().then(buffer => Buffer.from(buffer)),
    fetch(logoUrl),
  ]);
  if (!logoResponse.ok) throw new Error("Unable to fetch brand logo");
  const logoBuffer = Buffer.from(await logoResponse.arrayBuffer());

  const base = sharp(baseBuffer);
  const { width: baseWidth, height: baseHeight } = await base.metadata();
  if (!baseWidth || !baseHeight) throw new Error("Unable to read base image dimensions");

  const logoWidth = Math.round(baseWidth * 0.14);
  const padding = Math.round(baseWidth * 0.03);

  const resizedLogo = await sharp(logoBuffer).resize({ width: logoWidth }).toBuffer();
  const { height: resizedHeight } = await sharp(resizedLogo).metadata();
  const logoHeight = resizedHeight ?? logoWidth;

  const left = Math.max(0, baseWidth - logoWidth - padding);
  const top = Math.max(0, baseHeight - logoHeight - padding);

  const composited = await base.composite([{ input: resizedLogo, left, top }]).png().toBuffer();

  return new Blob([new Uint8Array(composited)], { type: "image/png" });
}
