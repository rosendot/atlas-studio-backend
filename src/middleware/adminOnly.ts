import type { MiddlewareHandler } from "hono";
import type { Bindings, Variables } from "../../worker-configuration";

/**
 * Restrict route to admin only. Must be used after requireAuth.
 */
export const adminOnly: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  if (c.var.role !== "admin") {
    return c.json({ error: "Admin access required" }, 403);
  }
  await next();
};
