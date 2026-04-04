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
