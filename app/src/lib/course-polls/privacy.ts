import { createHmac, randomBytes } from "node:crypto";

export const COURSE_POLL_VOTER_COOKIE = "prismarium_course_poll_voter";
export const COURSE_POLL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

const VOTER_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const HEADER_NAME_PATTERN = /^[a-z0-9-]+$/;

export interface HeaderReader {
  get(name: string): string | null;
}

export function generateCoursePollVoterToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isCoursePollVoterToken(
  value: string | undefined,
): value is string {
  return typeof value === "string" && VOTER_TOKEN_PATTERN.test(value);
}

export function isCoursePollHashSecretValid(
  value: string | undefined,
): value is string {
  return typeof value === "string" && value.trim().length >= 32;
}

export function hashCoursePollIdentifier(
  secret: string,
  pollSlug: string,
  kind: "voter" | "network",
  identifier: string,
): string {
  if (!isCoursePollHashSecretValid(secret)) {
    throw new Error("Course poll hash secret is not configured safely");
  }

  return createHmac("sha256", secret)
    .update(`course-path-poll:v1:${pollSlug}:${kind}:`)
    .update(identifier)
    .digest("hex");
}

/**
 * Read only the deployment platform's configured client-network header.
 * The caller hashes the returned value immediately and never persists or logs
 * it. We deliberately never inspect the user-agent header.
 */
export function readTrustedCoursePollNetwork(
  headers: HeaderReader,
  configuredHeader = "x-vercel-forwarded-for",
): string | null {
  const headerName = configuredHeader.trim().toLowerCase();
  if (!HEADER_NAME_PATTERN.test(headerName)) return null;

  const rawValue = headers.get(headerName);
  if (!rawValue) return null;

  const firstValue = rawValue.split(",", 1)[0]?.trim();
  if (!firstValue || firstValue.length > 64) return null;
  return firstValue;
}

export function getCoursePollCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: COURSE_POLL_COOKIE_MAX_AGE_SECONDS,
  };
}
