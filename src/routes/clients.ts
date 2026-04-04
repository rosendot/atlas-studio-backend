import { Router } from "express";
import pool from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { success } from "../utils/response.js";

export const clientsRouter = Router();

/** GET /clients — admin only, list all clients */
clientsRouter.get(
  "/",
  requireAuth,
  adminOnly,
  async (_req: AuthRequest, res, next) => {
    try {
      const { rows } = await pool.query(
        "SELECT * FROM clients ORDER BY created_at DESC",
      );
      return success(res, rows);
    } catch (err) {
      next(err);
    }
  },
);
