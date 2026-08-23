import { describe, expect, it } from "vitest";

import {
  companyLogoCandidates,
  faviconLogoUrl,
  googleFaviconUrl,
  logoPathForWebsite,
  normalizeWebsiteHost,
  publicLogoUrl,
  resolveCompanyLogoUrl,
  siteFaviconUrl,
} from "@/lib/logos";

describe("normalizeWebsiteHost", () => {
  it("strips protocol, www, and path", () => {
    expect(normalizeWebsiteHost("https://www.GitHub.com/org/repo")).toBe(
      "github.com",
    );
  });
});

describe("favicon sources", () => {
  it("uses the site favicon first", () => {
    expect(siteFaviconUrl("https://www.notion.so/product")).toBe(
      "https://www.notion.so/favicon.ico",
    );
    expect(faviconLogoUrl("https://www.notion.so/product")).toBe(
      "https://www.notion.so/favicon.ico",
    );
  });

  it("keeps Google as a fallback helper", () => {
    expect(googleFaviconUrl("https://www.notion.so/product")).toBe(
      "https://www.google.com/s2/favicons?sz=128&domain=notion.so",
    );
  });
});

describe("logoPathForWebsite", () => {
  it("keeps an explicit logo", () => {
    expect(logoPathForWebsite("https://openai.com", "custom.png")).toBe(
      "custom.png",
    );
  });

  it("persists the site favicon when none is provided", () => {
    expect(logoPathForWebsite("https://www.figma.com")).toBe(
      "https://www.figma.com/favicon.ico",
    );
  });

  it("skips generic demo hosts", () => {
    expect(logoPathForWebsite("https://example.com/gary")).toBeNull();
  });
});

describe("companyLogoCandidates", () => {
  it("orders site favicon ahead of Google and a stored path", () => {
    expect(
      companyLogoCandidates({
        logoPath: "https://cdn.example/logo.png",
        websiteUrl: "https://www.spotify.com",
      }),
    ).toEqual([
      "https://www.spotify.com/favicon.ico",
      "https://www.google.com/s2/favicons?sz=128&domain=spotify.com",
      "https://cdn.example/logo.png",
    ]);
  });

  it("does not invent logos for example.com", () => {
    expect(
      companyLogoCandidates({
        logoPath: null,
        websiteUrl: "https://example.com/gary",
      }),
    ).toEqual([]);
  });
});

describe("resolveCompanyLogoUrl", () => {
  it("returns the site favicon first", () => {
    expect(
      resolveCompanyLogoUrl({
        logoPath: "https://cdn.example/logo.png",
        websiteUrl: "https://figma.com",
      }),
    ).toBe("https://figma.com/favicon.ico");
  });

  it("falls back to a stored path when there is no website", () => {
    expect(
      resolveCompanyLogoUrl({
        logoPath: "https://cdn.example/logo.png",
        websiteUrl: null,
      }),
    ).toBe("https://cdn.example/logo.png");
  });
});

describe("publicLogoUrl", () => {
  it("returns null for empty values", () => {
    expect(publicLogoUrl(null)).toBeNull();
    expect(publicLogoUrl("")).toBeNull();
  });
});
