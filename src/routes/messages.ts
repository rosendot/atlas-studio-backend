import { Hono } from "hono";
import { and, asc, eq, isNull, ne } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema, type Db } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { missingField } from "../utils/validate";
import { error, success } from "../utils/response";

export const messagesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** Verify the requesting user has access to the given project. */
async function verifyProjectAccess(
  db: Db,
  projectId: string,
  uid: string,
  role: "admin" | "client",
): Promise<boolean> {
  if (role === "admin") return true;

  const [row] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.clients.authUid, uid)),
    )
    .limit(1);
  return !!row;
}

/** GET /messages?project_id=xxx — get conversation thread */
messagesRouter.get("/", requireAuth, async (c) => {
  const projectId = c.req.query("project_id");
  if (!projectId) return error(c, "project_id query parameter is required");

  const db = getDb(c.env);
  if (!(await verifyProjectAccess(db, projectId, c.var.uid, c.var.role))) {
    return error(c, "Access denied", 403);
  }

  const rows = await db
    .select()
    .from(schema.messages)
    .where(eq(schema.messages.projectId, projectId))
    .orderBy(asc(schema.messages.createdAt));

  // Mark unread messages from the other party as read.
  await db
    .update(schema.messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(schema.messages.projectId, projectId),
        ne(schema.messages.senderUid, c.var.uid),
        isNull(schema.messages.readAt),
      ),
    );

  return success(c, rows);
});

/** POST /messages — send a message */
messagesRouter.post("/", requireAuth, async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return error(c, "Invalid JSON body");

  const missing = missingField(body, ["project_id", "body"]);
  if (missing) return error(c, `${missing} is required`);

  const projectId = String(body.project_id);

  const db = getDb(c.env);
  if (!(await verifyProjectAccess(db, projectId, c.var.uid, c.var.role))) {
    return error(c, "Access denied", 403);
  }

  const [message] = await db
    .insert(schema.messages)
    .values({
      projectId,
      senderUid: c.var.uid,
      senderRole: c.var.role,
      body: String(body.body),
    })
    .returning();

  return success(c, message, 201);
});
