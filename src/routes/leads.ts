import { Hono } from "hono";
import { desc, eq } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { rateLimit } from "../middleware/rateLimit";
import { capString, isUuid, isValidEmail, missingField } from "../utils/validate";
import { error, success } from "../utils/response";
import { sendLeadAlert } from "../services/email";

export const leadsRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

const VALID_STATUSES = ["new", "contacted", "converted", "closed"] as const;
const MAX_BODY_BYTES = 16 * 1024; // 16 KB — far more than a contact form needs.

/** POST /leads — public, contact form submission */
leadsRouter.post(
  "/",
  rateLimit({ name: "leads", limit: 5, windowSeconds: 60 * 60 }),
  async (c) => {
    const contentLength = Number(c.req.header("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return error(c, "Request body too large", 413);
    }

    const body = await c.req.json<Record<string, unknown>>().catch(() => null);
    if (!body) return error(c, "Invalid JSON body");

    // Honeypot: bots fill every field; humans don't see this one. If any value
    // is present, accept the submission silently (don't tip the bot off) but
    // skip storage + email.
    if (typeof body.website_url === "string" && body.website_url.trim()) {
      return success(c, { ok: true }, 201);
    }

    const missing = missingField(body, ["name", "business", "email"]);
    if (missing) return error(c, `${missing} is required`);
    if (typeof body.email !== "string" || !isValidEmail(body.email)) {
      return error(c, "Invalid email address");
    }

    const name = capString(body.name, 120);
    const business = capString(body.business, 200);
    const email = capString(body.email, 200);
    if (!name || !business || !email) {
      return error(c, "name, business, and email are required");
    }

    const lead = {
      name,
      business,
      email,
      phone: capString(body.phone, 50),
      pos: capString(body.pos, 50),
      website: capString(body.website, 200),
      message: capString(body.message, 2000),
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
      }).catch((err) => console.error("Failed to send lead alert:", err.name, err.message)),
    );

    return success(c, inserted, 201);
  },
);

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
  const id = c.req.param("id");
  if (!isUuid(id)) return error(c, "Invalid lead id", 400);

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
    .where(eq(schema.leads.id, id))
    .returning();

  if (!updated) return error(c, "Lead not found", 404);
  return success(c, updated);
});
