import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const VISITOR_COOKIE = "pp_vid";
const VISITOR_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getVisitorSecret(): string {
  if (process.env.VISITOR_SECRET) {
    return process.env.VISITOR_SECRET;
  }
  if (process.env.CRON_SECRET) {
    return process.env.CRON_SECRET;
  }
  if (
    process.env.NODE_ENV === "development" ||
    process.env.DEMO_MODE === "true"
  ) {
    return "dev-visitor-secret";
  }
  throw new Error(
    "VISITOR_SECRET (or CRON_SECRET) must be set outside development.",
  );
}

function secretKey() {
  return new TextEncoder().encode(getVisitorSecret());
}

/**
 * Returns a stable visitor id from the signed HttpOnly `pp_vid` cookie,
 * creating and setting one when missing or invalid.
 */
export async function getOrCreateVisitorId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(VISITOR_COOKIE)?.value;
  const key = secretKey();

  if (existing) {
    try {
      const { payload } = await jwtVerify(existing, key);
      if (typeof payload.sub === "string" && payload.sub.length > 0) {
        return payload.sub;
      }
    } catch {
      // Invalid or expired token — issue a new one below.
    }
  }

  const visitorId = crypto.randomUUID();
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(visitorId)
    .setIssuedAt()
    .setExpirationTime(`${VISITOR_MAX_AGE_SECONDS}s`)
    .sign(key);

  cookieStore.set(VISITOR_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: VISITOR_MAX_AGE_SECONDS,
  });

  return visitorId;
}

/**
 * Privacy-preserving daily IP fingerprint. Never store the raw IP.
 */
export async function hashIpForDay(
  ip: string,
  dayKey: string,
): Promise<string> {
  const salt = process.env.IP_HASH_SALT || "dev";
  const material = new TextEncoder().encode(`${dayKey}:${ip}:${salt}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
