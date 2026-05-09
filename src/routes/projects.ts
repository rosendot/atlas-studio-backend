import { Hono } from "hono";
import { desc, eq, getTableColumns } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { missingField } from "../utils/validate";
import { error, success } from "../utils/response";

export const projectsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VALID_STATUSES = [
  "discovery",
  "design",
  "development",
  "review",
  "live",
  "maintenance",
] as const;

/** GET /projects — admin gets all, client gets their own */
projectsRouter.get("/", requireAuth, async (c) => {
  const db = getDb(c.env);

  if (c.var.role === "admin") {
    const rows = await db
      .select({
        ...getTableColumns(schema.projects),
        clientName: schema.clients.name,
        business: schema.clients.business,
      })
      .from(schema.projects)
      .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
      .orderBy(desc(schema.projects.createdAt));
    return success(c, rows);
  }

  const rows = await db
    .select(getTableColumns(schema.projects))
    .from(schema.projects)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(eq(schema.clients.authUid, c.var.uid))
    .orderBy(desc(schema.projects.createdAt));
  return success(c, rows);
});

/** GET /projects/:id — admin or owning client */
projectsRouter.get("/:id", requireAuth, async (c) => {
  const db = getDb(c.env);

  const [row] = await db
    .select({
      ...getTableColumns(schema.projects),
      clientName: schema.clients.name,
      business: schema.clients.business,
      authUid: schema.clients.authUid,
    })
    .from(schema.projects)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(eq(schema.projects.id, c.req.param("id")))
    .limit(1);

  if (!row) return error(c, "Project not found", 404);
  if (c.var.role !== "admin" && row.authUid !== c.var.uid) {
    return error(c, "Access denied", 403);
  }

  return success(c, row);
});

/** POST /projects — admin only */
projectsRouter.post("/", requireAuth, adminOnly, async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return error(c, "Invalid JSON body");

  const missing = missingField(body, ["client_id", "title"]);
  if (missing) return error(c, `${missing} is required`);

  const db = getDb(c.env);
  const [project] = await db
    .insert(schema.projects)
    .values({
      clientId: String(body.client_id),
      title: String(body.title),
      description: body.description ? String(body.description) : null,
      startDate: body.start_date ? String(body.start_date) : null,
    })
    .returning();

  return success(c, project, 201);
});

/** PATCH /projects/:id — admin only */
projectsRouter.patch("/:id", requireAuth, adminOnly, async (c) => {
  const body = (await c.req
    .json<Record<string, unknown>>()
    .catch(() => ({}))) as Record<string, unknown>;

  if (
    body.status !== undefined &&
    !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])
  ) {
    return error(c, `status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const updates: Partial<typeof schema.projects.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (body.title !== undefined) updates.title = String(body.title);
  if (body.description !== undefined) updates.description = String(body.description);
  if (body.status !== undefined) updates.status = String(body.status);
  if (body.launch_date !== undefined) updates.launchDate = String(body.launch_date);
  if (body.site_url !== undefined) updates.siteUrl = String(body.site_url);

  const db = getDb(c.env);
  const [updated] = await db
    .update(schema.projects)
    .set(updates)
    .where(eq(schema.projects.id, c.req.param("id")))
    .returning();

  if (!updated) return error(c, "Project not found", 404);
  return success(c, updated);
});
