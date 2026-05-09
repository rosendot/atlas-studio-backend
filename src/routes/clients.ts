import { Hono } from "hono";
import { desc } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { success } from "../utils/response";

export const clientsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** GET /clients — admin only, list all clients */
clientsRouter.get("/", requireAuth, adminOnly, async (c) => {
  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(schema.clients)
    .orderBy(desc(schema.clients.createdAt));
  return success(c, rows);
});
