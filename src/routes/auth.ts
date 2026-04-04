import { Router } from "express";
import { getAuth } from "firebase-admin/auth";
import pool from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { missingField, isValidEmail } from "../utils/validate.js";
import { success, error } from "../utils/response.js";
import { initFirebase } from "../services/firebase.js";
import { sendClientInvite } from "../services/email.js";

export const authRouter = Router();

/**
 * POST /auth/invite — admin only
 * Convert a lead into a client: create Firebase user, insert into clients table, send invite email.
 */
authRouter.post(
  "/invite",
  requireAuth,
  adminOnly,
  async (req: AuthRequest, res, next) => {
    try {
      initFirebase();

      const missing = missingField(req.body, ["lead_id"]);
      if (missing) return error(res, `${missing} is required`);

      const { lead_id } = req.body;

      // Get the lead
      const { rows: leads } = await pool.query(
        "SELECT * FROM leads WHERE id = $1",
        [lead_id],
      );
      if (leads.length === 0) return error(res, "Lead not found", 404);

      const lead = leads[0];

      // Check if client already exists for this lead
      const { rows: existing } = await pool.query(
        "SELECT id FROM clients WHERE lead_id = $1",
        [lead_id],
      );
      if (existing.length > 0)
        return error(res, "This lead has already been converted to a client");

      // Create Firebase user
      const firebaseUser = await getAuth().createUser({
        email: lead.email,
        displayName: lead.name,
      });

      // Generate password reset link (acts as invite)
      const inviteLink = await getAuth().generatePasswordResetLink(lead.email);

      // Insert client record
      const { rows: clients } = await pool.query(
        `INSERT INTO clients (lead_id, firebase_uid, name, business, email)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [lead_id, firebaseUser.uid, lead.name, lead.business, lead.email],
      );

      // Update lead status
      await pool.query("UPDATE leads SET status = 'converted' WHERE id = $1", [
        lead_id,
      ]);

      // Send invite email
      sendClientInvite(lead.email, lead.name, inviteLink).catch((err) =>
        console.error("Failed to send invite:", err),
      );

      return success(res, clients[0], 201);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /auth/reset — public, request a password reset link
 */
authRouter.post("/reset", async (req, res, next) => {
  try {
    initFirebase();

    const { email } = req.body;
    if (!email || !isValidEmail(email))
      return error(res, "Valid email is required");

    // Always return success to avoid leaking whether the email exists
    try {
      const link = await getAuth().generatePasswordResetLink(email);
      // In production, send this via email instead of returning it
      console.log(`Password reset link generated for ${email}`);
    } catch {
      // User doesn't exist — don't reveal this
    }

    return success(res, { message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    next(err);
  }
});
