const STORAGE_PREFIX = "/storage/v1/object/public/logos/";

const GENERIC_HOSTS = new Set(["example.com", "localhost", "127.0.0.1"]);

/** Strip protocol, path, and leading www. for host comparisons. */
export function normalizeWebsiteHost(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.replace(/^www\./, "");
  } catch {
    return url
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]!;
  }
}

/** Accept "acme.com" as well as a full URL. */
export function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** Board name from a website when the submitter does not provide one. */
export function displayNameFromWebsite(url: string): string {
  const host = normalizeWebsiteHost(url);
  const labels = host.split(".").filter(Boolean);
  const slug = (
    labels.length >= 2 ? labels[labels.length - 2]! : (labels[0] ?? host)
  ).replace(/[-_]+/g, " ");
  const titled = slug.replace(/\b[a-z]/g, (char) => char.toUpperCase()).trim();
  const name = titled || host;
  if (name.length >= 2) return name.slice(0, 80);
  return `${name} Co`.slice(0, 80);
}

function isGenericHost(host: string): boolean {
  return GENERIC_HOSTS.has(host) || host.endsWith(".example.com");
}

function usableWebsite(websiteUrl: string): boolean {
  const host = normalizeWebsiteHost(websiteUrl);
  return Boolean(host) && !isGenericHost(host);
}

/** Hostname for card subtitles. Generic demo hosts stay hidden. */
export function displayWebsiteHost(
  websiteUrl: string | null | undefined,
): string | null {
  if (!websiteUrl || !usableWebsite(websiteUrl)) return null;
  return normalizeWebsiteHost(websiteUrl);
}

/** Live-site screenshot for podium cards. Generic demo hosts return null. */
export function websiteScreenshotUrl(
  websiteUrl: string | null | undefined,
): string | null {
  if (!websiteUrl || !usableWebsite(websiteUrl)) return null;
  return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(websiteUrl)}?w=1200`;
}

/** The site's own favicon, used first when filling or showing a logo. */
export function siteFaviconUrl(websiteUrl: string): string | null {
  if (!usableWebsite(websiteUrl)) return null;
  try {
    return new URL("/favicon.ico", websiteUrl).href;
  } catch {
    const host = normalizeWebsiteHost(websiteUrl);
    return host ? `https://${host}/favicon.ico` : null;
  }
}

/** Fallback when /favicon.ico is missing or blocked. */
export function googleFaviconUrl(websiteUrl: string): string | null {
  if (!usableWebsite(websiteUrl)) return null;
  const host = normalizeWebsiteHost(websiteUrl);
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}`;
}

/** Persistable favicon URL: the site file first. */
export function faviconLogoUrl(websiteUrl: string): string {
  return siteFaviconUrl(websiteUrl) ?? googleFaviconUrl(websiteUrl) ?? "";
}

export function publicLogoUrl(
  logoPath: string | null | undefined,
): string | null {
  if (!logoPath) return null;
  if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
    return logoPath;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return logoPath;
  return `${base}${STORAGE_PREFIX}${logoPath}`;
}

/**
 * Try the website favicon first, then Google's helper, then a stored path.
 * Generic demo hosts (example.com) stay on initials.
 */
export function companyLogoCandidates(input: {
  logoPath?: string | null;
  websiteUrl?: string | null;
}): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const push = (url: string | null | undefined) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    urls.push(url);
  };

  if (input.websiteUrl) {
    push(siteFaviconUrl(input.websiteUrl));
    push(googleFaviconUrl(input.websiteUrl));
  }
  push(publicLogoUrl(input.logoPath));
  return urls;
}

export function resolveCompanyLogoUrl(input: {
  logoPath?: string | null;
  websiteUrl?: string | null;
}): string | null {
  return companyLogoCandidates(input)[0] ?? null;
}

/** Persist a favicon when a website is submitted, unless an explicit path was given. */
export function logoPathForWebsite(
  websiteUrl: string,
  explicit?: string | null,
): string | null {
  if (explicit) return explicit;
  return siteFaviconUrl(websiteUrl) ?? googleFaviconUrl(websiteUrl);
}
