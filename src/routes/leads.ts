import { Router } from "express";
import pool from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { missingField, isValidEmail } from "../utils/validate.js";
import { success, error } from "../utils/response.js";
import { sendLeadAlert } from "../services/email.js";

export const leadsRouter = Router();

/** POST /leads — public, contact form submission */
leadsRouter.post("/", async (req, res, next) => {
  try {
    const missing = missingField(req.body, ["name", "business", "email"]);
    if (missing) return error(res, `${missing} is required`);
    if (!isValidEmail(req.body.email))
      return error(res, "Invalid email address");

    const { name, business, email, phone, pos, website, message } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO leads (name, business, email, phone, pos, website, message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, business, email, phone || null, pos || null, website || null, message || null],
    );

    // Send email notification (don't block the response)
    sendLeadAlert({ name, business, email, phone, pos, website, message }).catch(
      (err) => console.error("Failed to send lead alert:", err),
    );

    return success(res, rows[0], 201);
  } catch (err) {
    next(err);
  }
});

/** GET /leads — admin only, list all leads */
leadsRouter.get(
  "/",
  requireAuth,
  adminOnly,
  async (_req: AuthRequest, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM leads ORDER BY created_at DESC",
      );
      return success(res, rows);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /leads/:id — admin only, update lead status */
leadsRouter.patch(
  "/:id",
  requireAuth,
  adminOnly,
  async (req: AuthRequest, res, next) => {
    try {
      const { status } = req.body;
      const validStatuses = ["new", "contacted", "converted", "closed"];
      if (!status || !validStatuses.includes(status)) {
        return error(res, `status must be one of: ${validStatuses.join(", ")}`);
      }

      const { rows } = await pool.query(
        "UPDATE leads SET status = $1 WHERE id = $2 RETURNING *",
        [status, req.params.id],
      );

      if (rows.length === 0) return error(res, "Lead not found", 404);
      return success(res, rows[0]);
    } catch (err) {
      next(err);
    }
  },
);
