import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema } from "../db/client";
import { getAuth } from "../lib/auth";
import { requireAuth } from "../middleware/auth";
import { adminOnly } from "../middleware/adminOnly";
import { isValidEmail, missingField } from "../utils/validate";
import { error, success } from "../utils/response";

export const authRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/**
 * POST /auth/invite — admin only.
 *
 * Convert a lead into a client:
 *   1. Create a Better Auth user with a random throwaway password.
 *   2. Trigger Better Auth's password reset email — the link in that email
 *      is the actual invite. Clicking it lets the client set their real password.
 *   3. Insert into the clients table, link via auth_uid.
 *
 * Better Auth's `sendResetPassword` hook (configured in src/lib/auth.ts)
 * is what actually sends the email through Resend.
 */
authRouter.post("/invite", requireAuth, adminOnly, async (c) => {
  const body = (await c.req
    .json<{ lead_id?: string }>()
    .catch(() => ({}))) as { lead_id?: string };
  const missing = missingField(body, ["lead_id"]);
  if (missing) return error(c, `${missing} is required`);

  const db = getDb(c.env);

  const [lead] = await db
    .select()
    .from(schema.leads)
    .where(eq(schema.leads.id, body.lead_id!))
    .limit(1);
  if (!lead) return error(c, "Lead not found", 404);

  const [existing] = await db
    .select({ id: schema.clients.id })
    .from(schema.clients)
    .where(eq(schema.clients.leadId, lead.id))
    .limit(1);
  if (existing) return error(c, "This lead has already been converted to a client");

  const auth = getAuth(c.env);

  // 1. Provision the auth user. Random password is fine — the client never
  //    sees it; they set their real password through the reset flow.
  const throwaway = crypto.randomUUID() + crypto.randomUUID();
  const signUpResult = await auth.api.signUpEmail({
    body: {
      email: lead.email,
      password: throwaway,
      name: lead.name,
    },
  });

  if (!signUpResult?.user) {
    return error(c, "Failed to provision auth user", 502);
  }

  // 2. Insert the client row, linked to the new auth user.
  const [client] = await db
    .insert(schema.clients)
    .values({
      leadId: lead.id,
      authUid: signUpResult.user.id,
      name: lead.name,
      business: lead.business,
      email: lead.email,
    })
    .returning();

  await db
    .update(schema.leads)
    .set({ status: "converted" })
    .where(eq(schema.leads.id, lead.id));

  // 3. Send the invite email by triggering Better Auth's reset-password flow.
  c.executionCtx.waitUntil(
    auth.api
      .requestPasswordReset({
        body: {
          email: lead.email,
          redirectTo: `${c.env.FRONTEND_URL}/portal/welcome`,
        },
      })
      .catch((err: unknown) =>
        console.error("Failed to send invite email:", err),
      ),
  );

  return success(c, client, 201);
});

/**
 * POST /auth/reset — public, request a password reset link.
 * Always responds success to avoid leaking whether the email exists.
 */
authRouter.post("/reset", async (c) => {
  const body = (await c.req
    .json<{ email?: string }>()
    .catch(() => ({}))) as { email?: string };
  if (!body.email || !isValidEmail(body.email)) {
    return error(c, "Valid email is required");
  }

  const auth = getAuth(c.env);

  c.executionCtx.waitUntil(
    auth.api
      .requestPasswordReset({
        body: {
          email: body.email,
          redirectTo: `${c.env.FRONTEND_URL}/portal/reset`,
        },
      })
      .catch(() => undefined),
  );

  return success(c, {
    message: "If that email exists, a reset link has been sent.",
  });
});
