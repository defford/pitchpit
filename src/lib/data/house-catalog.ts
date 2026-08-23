/** Stable house owner used by leftover seed rows + retire-on-approve. */
export const HOUSE_OWNER_ID = "00000000-0000-4000-8000-000000000001";
export const HOUSE_OWNER_EMAIL = "house@pitchpit.lol";

export { faviconLogoUrl, normalizeWebsiteHost } from "@/lib/logos";

export function isHouseOwnerId(ownerId: string | null | undefined): boolean {
  return ownerId === HOUSE_OWNER_ID;
}
