import type { MiddlewareHandler } from "hono";
import type { Bindings, Variables } from "../../worker-configuration";
import { getAuth } from "../lib/auth";

/**
 * Verify the Better Auth session cookie, set c.var.uid and c.var.role,
 * then call next. Rejects with 401 on missing/invalid sessions.
 */
export const requireAuth: MiddlewareHandler<{
  Bindings: Bindings;
  Variables: Variables;
}> = async (c, next) => {
  const auth = getAuth(c.env);
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session?.user) {
    return c.json({ error: "Not authenticated" }, 401);
  }

  c.set("uid", session.user.id);
  c.set("role", session.user.id === c.env.ADMIN_UID ? "admin" : "client");

  await next();
};
