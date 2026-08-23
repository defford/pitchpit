import { describe, expect, it } from "vitest";

import {
  companyLogoCandidates,
  displayNameFromWebsite,
  displayWebsiteHost,
  faviconLogoUrl,
  googleFaviconUrl,
  logoPathForWebsite,
  normalizeWebsiteHost,
  normalizeWebsiteUrl,
  publicLogoUrl,
  resolveCompanyLogoUrl,
  siteFaviconUrl,
  websiteScreenshotUrl,
} from "@/lib/logos";

describe("normalizeWebsiteHost", () => {
  it("strips protocol, www, and path", () => {
    expect(normalizeWebsiteHost("https://www.GitHub.com/org/repo")).toBe(
      "github.com",
    );
  });
});

describe("normalizeWebsiteUrl", () => {
  it("adds https when the protocol is missing", () => {
    expect(normalizeWebsiteUrl("acme.com/path")).toBe("https://acme.com/path");
    expect(normalizeWebsiteUrl("https://acme.com")).toBe("https://acme.com");
  });
});

describe("displayNameFromWebsite", () => {
  it("uses the registrable label", () => {
    expect(displayNameFromWebsite("https://www.github.com/org")).toBe("Github");
    expect(displayNameFromWebsite("https://open.ai")).toBe("Open");
  });

  it("pads a one-letter host", () => {
    expect(displayNameFromWebsite("https://x.com")).toBe("X Co");
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

describe("displayWebsiteHost", () => {
  it("returns a clean host for real sites", () => {
    expect(displayWebsiteHost("https://www.github.com/org")).toBe("github.com");
  });

  it("hides generic demo hosts", () => {
    expect(displayWebsiteHost("https://example.com/gary")).toBeNull();
    expect(displayWebsiteHost(null)).toBeNull();
  });
});

describe("websiteScreenshotUrl", () => {
  it("builds an mshots url for real sites", () => {
    expect(websiteScreenshotUrl("https://openai.com")).toBe(
      "https://s.wordpress.com/mshots/v1/https%3A%2F%2Fopenai.com?w=1200",
    );
  });

  it("skips generic demo hosts", () => {
    expect(websiteScreenshotUrl("https://example.com/gary")).toBeNull();
    expect(websiteScreenshotUrl(null)).toBeNull();
  });
});
