import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { Bindings } from "../../worker-configuration";

export type Db = DrizzleD1Database<typeof schema>;

/**
 * Build a Drizzle client over the D1 binding for the current request.
 * D1 bindings live on `env`, not on a singleton — call this per-request.
 */
export function getDb(env: Bindings): Db {
  return drizzle(env.DB, { schema });
}

export { schema };
