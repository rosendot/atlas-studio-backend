// Bindings exposed to the Worker via wrangler.toml.
// Imported by Hono's generic so c.env is fully typed.

export interface Bindings {
  // Plain vars
  FRONTEND_URL: string;

  // Secrets
  RESEND_API_KEY: string;
  ADMIN_UID: string;
  BETTER_AUTH_SECRET: string;

  // Optional OAuth providers — populated when wired up
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;

  // Resource bindings
  DB: D1Database;
  FILES: R2Bucket;
}

// Hono's typed context variables (set by middleware).
export interface Variables {
  uid: string;
  role: "admin" | "client";
}
