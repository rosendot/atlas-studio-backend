/**
 * Studio-wide constants. Centralized so changes don't drift across files.
 */

/**
 * The studio's sending address — used as `from` on every transactional email
 * (lead alerts, password resets, verification, milestone notifications) and as
 * the admin notification recipient. Must be a verified sender in Resend before
 * production email will deliver.
 */
export const STUDIO_EMAIL = "rosendo@atlasstudio.dev";

/** Display name used in email signoffs and subjects. */
export const STUDIO_NAME = "Atlas Studio";
