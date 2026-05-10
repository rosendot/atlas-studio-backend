import type { MiddlewareHandler } from "hono";
import type { Bindings, Variables } from "../../worker-configuration";
import { error } from "../utils/response";

type RateLimitOptions = {
  /** Identifier for this limiter (used to namespace keys). */
  name: string;
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

/**
 * Simple D1-backed sliding-window rate limiter, keyed by client IP.
 *
 * Stores hit counts in the `rate_limits` table. Falls back to allowing
 * requests when the IP can't be determined (rare; only happens in dev with
 * no `CF-Connecting-IP` header — production always has it).
 */
export function rateLimit(opts: RateLimitOptions): MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> {
  return async (c, next) => {
    const ip =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For")?.split(",")[0]?.trim();
    if (!ip) return next();

    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - opts.windowSeconds;
    const key = `${opts.name}:${ip}`;

    // Count existing hits in the window. We use raw D1 here (not Drizzle)
    // to keep the rate limiter independent of the app schema.
    const db = c.env.DB;
    await db
      .prepare(
        "CREATE TABLE IF NOT EXISTS rate_limits (key TEXT NOT NULL, hit_at INTEGER NOT NULL, PRIMARY KEY (key, hit_at))",
      )
      .run();

    // Purge old entries lazily for this key.
    await db
      .prepare("DELETE FROM rate_limits WHERE key = ? AND hit_at < ?")
      .bind(key, windowStart)
      .run();

    const row = await db
      .prepare("SELECT COUNT(*) as n FROM rate_limits WHERE key = ?")
      .bind(key)
      .first<{ n: number }>();

    if (row && row.n >= opts.limit) {
      const retryAfter = opts.windowSeconds;
      c.header("Retry-After", String(retryAfter));
      return error(c, "Too many requests. Please slow down.", 429);
    }

    await db
      .prepare("INSERT INTO rate_limits (key, hit_at) VALUES (?, ?)")
      .bind(key, now)
      .run();

    return next();
  };
}
