import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { isValidEmail, missingField } from "../utils/validate";
import { error, success } from "../utils/response";
import { sendLeadAlert } from "../services/email";

export const leadsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VALID_STATUSES = ["new", "contacted", "converted", "closed"] as const;

/** POST /leads — public, contact form submission */
leadsRouter.post("/", async (c) => {
  const body = await c.req.json<Record<string, unknown>>().catch(() => null);
  if (!body) return error(c, "Invalid JSON body");

  const missing = missingField(body, ["name", "business", "email"]);
  if (missing) return error(c, `${missing} is required`);
  if (typeof body.email !== "string" || !isValidEmail(body.email)) {
    return error(c, "Invalid email address");
  }

  const lead = {
    name: String(body.name),
    business: String(body.business),
    email: body.email,
    phone: body.phone ? String(body.phone) : null,
    pos: body.pos ? String(body.pos) : null,
    website: body.website ? String(body.website) : null,
    message: body.message ? String(body.message) : null,
  };

  const db = getDb(c.env);
  const [inserted] = await db.insert(schema.leads).values(lead).returning();

  c.executionCtx.waitUntil(
    sendLeadAlert(c.env, {
      name: lead.name,
      business: lead.business,
      email: lead.email,
      phone: lead.phone ?? undefined,
      pos: lead.pos ?? undefined,
      website: lead.website ?? undefined,
      message: lead.message ?? undefined,
    }).catch((err) => console.error("Failed to send lead alert:", err)),
  );

  return success(c, inserted, 201);
});

/** GET /leads — admin only, list all leads */
leadsRouter.get("/", requireAuth, adminOnly, async (c) => {
  const db = getDb(c.env);
  const rows = await db
    .select()
    .from(schema.leads)
    .orderBy(desc(schema.leads.createdAt));
  return success(c, rows);
});

/** PATCH /leads/:id — admin only, update lead status */
leadsRouter.patch("/:id", requireAuth, adminOnly, async (c) => {
  const body = (await c.req
    .json<{ status?: string }>()
    .catch(() => ({}))) as { status?: string };
  const status = body.status;

  if (!status || !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return error(c, `status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const db = getDb(c.env);
  const [updated] = await db
    .update(schema.leads)
    .set({ status })
    .where(eq(schema.leads.id, c.req.param("id")))
    .returning();

  if (!updated) return error(c, "Lead not found", 404);
  return success(c, updated);
});
