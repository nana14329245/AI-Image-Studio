/**
 * Who runs the service, as shown on the legal pages.
 *
 * The seller is an individual, not a company, and is not VAT-registered, so the
 * pages say that no tax invoice can be issued. Set the name and contact email per
 * deployment; until they are set the pages show a visible placeholder rather
 * than inventing details.
 */
export const LEGAL_EFFECTIVE_DATE = "17 กันยายน 2569";

export const SERVICE_NAME = "AI Image Studio";

export function sellerName(): string {
  return process.env.NEXT_PUBLIC_LEGAL_SELLER_NAME?.trim() || "[ชื่อ-นามสกุลผู้ให้บริการ]";
}

export function contactEmail(): string | null {
  return process.env.NEXT_PUBLIC_LEGAL_CONTACT_EMAIL?.trim() || null;
}

/** Days within which a billing problem should be reported for a refund review. */
export const REFUND_REQUEST_DAYS = 14;

/** Days within which a data request (access, deletion, and so on) is answered. */
export const DATA_REQUEST_RESPONSE_DAYS = 30;
