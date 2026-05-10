import { Hono } from "hono";
import { asc, eq } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import {
  capString,
  isUuid,
  missingField,
  safeDateString,
} from "../utils/validate";
import { error, success } from "../utils/response";
import { notifyMilestoneComplete } from "../services/notifications";

export const milestonesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VALID_STATUSES = ["pending", "in_progress", "complete"] as const;

/** GET /milestones?project_id=xxx — admin or owning client */
milestonesRouter.get("/", requireAuth, async (c) => {
  const projectId = c.req.query("project_id");
  if (!projectId || !isUuid(projectId)) {
    return error(c, "Valid project_id query parameter is required");
  }

  const db = getDb(c.env);

  const [project] = await db
    .select({ authUid: schema.clients.authUid })
    .from(schema.projects)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(eq(schema.projects.id, projectId))
    .limit(1);

  if (!project) return error(c, "Project not found", 404);
  if (c.var.role !== "admin" && project.authUid !== c.var.uid) {
    return error(c, "Access denied", 403);
  }

  const rows = await db
    .select()
    .from(schema.milestones)
    .where(eq(schema.milestones.projectId, projectId))
    .orderBy(asc(schema.milestones.sortOrder), asc(schema.milestones.createdAt));

  return success(c, rows);
});

/** POST /milestones — admin only */
milestonesRouter.post("/", requireAuth, adminOnly, async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return error(c, "Invalid JSON body");

  const missing = missingField(body, ["project_id", "title"]);
  if (missing) return error(c, `${missing} is required`);
  if (!isUuid(body.project_id)) return error(c, "Invalid project_id");

  const title = capString(body.title, 200);
  if (!title) return error(c, "title is required");

  const dueDate =
    body.due_date !== undefined ? safeDateString(body.due_date) : null;
  if (body.due_date !== undefined && body.due_date !== null && !dueDate) {
    return error(c, "due_date must be a valid date");
  }

  const db = getDb(c.env);
  const [milestone] = await db
    .insert(schema.milestones)
    .values({
      projectId: body.project_id,
      title,
      description: capString(body.description, 2000),
      dueDate,
      sortOrder: typeof body.sort_order === "number" ? body.sort_order : 0,
    })
    .returning();

  return success(c, milestone, 201);
});

/** PATCH /milestones/:id — admin only */
milestonesRouter.patch("/:id", requireAuth, adminOnly, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return error(c, "Invalid milestone id", 400);

  const body = (await c.req
    .json<Record<string, unknown>>()
    .catch(() => ({}))) as Record<string, unknown>;

  if (
    body.status !== undefined &&
    !VALID_STATUSES.includes(body.status as (typeof VALID_STATUSES)[number])
  ) {
    return error(c, `status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const updates: Partial<typeof schema.milestones.$inferInsert> = {};
  if (body.title !== undefined) {
    const t = capString(body.title, 200);
    if (!t) return error(c, "title must be a non-empty string");
    updates.title = t;
  }
  if (body.description !== undefined) {
    updates.description = capString(body.description, 2000);
  }
  if (body.due_date !== undefined) {
    if (body.due_date === null) {
      updates.dueDate = null;
    } else {
      const d = safeDateString(body.due_date);
      if (!d) return error(c, "due_date must be a valid date");
      updates.dueDate = d;
    }
  }
  if (typeof body.sort_order === "number") updates.sortOrder = body.sort_order;
  if (body.status !== undefined) {
    updates.status = String(body.status);
    if (body.status === "complete") updates.completedAt = new Date();
  }

  const db = getDb(c.env);
  const [updated] = await db
    .update(schema.milestones)
    .set(updates)
    .where(eq(schema.milestones.id, id))
    .returning();

  if (!updated) return error(c, "Milestone not found", 404);

  if (body.status === "complete") {
    c.executionCtx.waitUntil(
      notifyMilestoneComplete(c.env, updated.id).catch((err) =>
        console.error("Failed to send milestone notification:", err.name, err.message),
      ),
    );
  }

  return success(c, updated);
});
