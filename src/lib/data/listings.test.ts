import { describe, expect, it } from "vitest";

import {
  findPublicListingByHost,
  upsertPublicListing,
} from "@/lib/data/companies";
import {
  listingInputFromPublic,
  startPublicListing,
} from "@/lib/data/listings";
import { getDemoStore } from "@/lib/data/demo-store";
import { publicListingSchema } from "@/lib/validation";

describe("publicListingSchema", () => {
  it("accepts a bare host", () => {
    const parsed = publicListingSchema.parse({
      pitch: "A twenty character pitch about the product.",
      website_url: "acme.com",
      tier: "pit",
    });
    expect(parsed.website_url).toBe("https://acme.com");
  });
});

describe("listingInputFromPublic", () => {
  it("names the listing from the host when name is omitted", () => {
    const parsed = publicListingSchema.parse({
      pitch: "A twenty character pitch about the product.",
      website_url: "https://www.figma.com",
      tier: "undercard",
    });
    const input = listingInputFromPublic(parsed);
    expect(input.name).toBe("Figma");
    expect(input.billingMode).toBe("one_day");
  });
});

describe("upsertPublicListing", () => {
  it("creates then reuses a guest listing by host", async () => {
    const first = await upsertPublicListing({
      name: "Acme",
      pitch: "A twenty character pitch about the product.",
      website_url: "https://acme-public-listing.test",
      tier: "pit",
      billingMode: "one_day",
    });
    expect(first.owner_id).toBeNull();
    expect(first.status).toBe("pending_review");

    const second = await upsertPublicListing({
      name: "Acme",
      pitch: "Updated pitch that is still long enough to pass.",
      website_url: "https://www.acme-public-listing.test/about",
      tier: "main_event",
      billingMode: "one_day",
    });
    expect(second.id).toBe(first.id);
    expect(second.tier).toBe("main_event");
    expect(second.pitch).toContain("Updated pitch");

    const found = await findPublicListingByHost("acme-public-listing.test");
    expect(found?.id).toBe(first.id);
  });
});


describe("startPublicListing", () => {
  it("approves and creates an open-ended placement without checkout", async () => {
    const payload = publicListingSchema.parse({
      pitch: "A twenty character pitch about the product.",
      website_url: "https://free-list-activation.test",
      tier: "pit",
    });
    const result = await startPublicListing(payload);
    expect(result.demo).toBe(true);
    expect(result.company.status).toBe("approved");
    expect(result.url).toContain("listed=demo");

    const store = getDemoStore();
    const placement = [...store.placements.values()].find(
      (row) => row.company_id === result.company.id && row.status === "active",
    );
    expect(placement).toBeTruthy();
    expect(placement?.ends_at?.startsWith("2099")).toBe(true);
  });
});
