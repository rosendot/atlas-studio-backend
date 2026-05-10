/**
 * Check that all required fields are present and non-empty strings.
 * Returns the name of the first missing field, or null if all present.
 */
export function missingField(
  body: Record<string, unknown>,
  fields: string[],
): string | null {
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      return field;
    }
  }
  return null;
}

/**
 * Basic email format check.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Truncate a string field for safe DB storage. Returns null if input is
 * nullish or empty after trimming.
 */
export function capString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

/** Strip CR/LF (and trim) to prevent header injection when used in email subjects. */
export function stripNewlines(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** UUID v4 pattern (also matches v1/v3/v5 since they share the format). */
export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Validate and normalize an http(s) URL. Returns the trimmed URL string, or
 * null if invalid. Rejects non-http(s) schemes to avoid `javascript:` / `data:` etc.
 */
export function safeHttpUrl(value: unknown, maxLength = 2000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Validate a date-ish string. Accepts ISO-8601 (with or without time) and
 * common YYYY-MM-DD inputs. Returns the original string if valid, null otherwise.
 */
export function safeDateString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const t = Date.parse(trimmed);
  if (Number.isNaN(t)) return null;
  return trimmed;
}
