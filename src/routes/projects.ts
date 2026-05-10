import { Hono } from "hono";
import { desc, eq, getTableColumns } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import {
  capString,
  isUuid,
  missingField,
  safeDateString,
  safeHttpUrl,
} from "../utils/validate";
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
  const id = c.req.param("id");
  if (!isUuid(id)) return error(c, "Invalid project id", 400);
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
    .where(eq(schema.projects.id, id))
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
  if (!isUuid(body.client_id)) return error(c, "Invalid client_id");

  const title = capString(body.title, 200);
  if (!title) return error(c, "title is required");

  const startDate =
    body.start_date !== undefined ? safeDateString(body.start_date) : null;
  if (body.start_date !== undefined && body.start_date !== null && !startDate) {
    return error(c, "start_date must be a valid date");
  }

  const db = getDb(c.env);
  const [project] = await db
    .insert(schema.projects)
    .values({
      clientId: body.client_id,
      title,
      description: capString(body.description, 2000),
      startDate,
    })
    .returning();

  return success(c, project, 201);
});

/** PATCH /projects/:id — admin only */
projectsRouter.patch("/:id", requireAuth, adminOnly, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return error(c, "Invalid project id", 400);

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
  if (body.title !== undefined) {
    const t = capString(body.title, 200);
    if (!t) return error(c, "title must be a non-empty string");
    updates.title = t;
  }
  if (body.description !== undefined) {
    updates.description = capString(body.description, 2000);
  }
  if (body.status !== undefined) updates.status = String(body.status);
  if (body.launch_date !== undefined) {
    if (body.launch_date === null) {
      updates.launchDate = null;
    } else {
      const d = safeDateString(body.launch_date);
      if (!d) return error(c, "launch_date must be a valid date");
      updates.launchDate = d;
    }
  }
  if (body.site_url !== undefined) {
    if (body.site_url === null || body.site_url === "") {
      updates.siteUrl = null;
    } else {
      const url = safeHttpUrl(body.site_url);
      if (!url) return error(c, "site_url must be a valid http(s) URL");
      updates.siteUrl = url;
    }
  }

  const db = getDb(c.env);
  const [updated] = await db
    .update(schema.projects)
    .set(updates)
    .where(eq(schema.projects.id, id))
    .returning();

  if (!updated) return error(c, "Project not found", 404);
  return success(c, updated);
});
