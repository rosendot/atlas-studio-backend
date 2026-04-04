import { Router } from "express";
import pool from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { missingField } from "../utils/validate.js";
import { success, error } from "../utils/response.js";

export const projectsRouter = Router();

/** GET /projects — admin gets all, client gets their own */
projectsRouter.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    if (req.role === "admin") {
      const { rows } = await pool.query(
        `SELECT p.*, c.name AS client_name, c.business
         FROM projects p
         JOIN clients c ON c.id = p.client_id
         ORDER BY p.created_at DESC`,
      );
      return success(res, rows);
    }

    // Client: get their own projects
    const { rows } = await pool.query(
      `SELECT p.*
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE c.firebase_uid = $1
       ORDER BY p.created_at DESC`,
      [req.uid],
    );
    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

/** GET /projects/:id — admin or owning client */
projectsRouter.get("/:id", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, c.name AS client_name, c.business, c.firebase_uid
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1`,
      [req.params.id],
    );

    if (rows.length === 0) return error(res, "Project not found", 404);

    const project = rows[0];
    if (req.role !== "admin" && project.firebase_uid !== req.uid) {
      return error(res, "Access denied", 403);
    }

    return success(res, project);
  } catch (err) {
    next(err);
  }
});

/** POST /projects — admin only */
projectsRouter.post(
  "/",
  requireAuth,
  adminOnly,
  async (req: AuthRequest, res, next) => {
    try {
      const missing = missingField(req.body, ["client_id", "title"]);
      if (missing) return error(res, `${missing} is required`);

      const { client_id, title, description, start_date } = req.body;

      const { rows } = await pool.query(
        `INSERT INTO projects (client_id, title, description, start_date)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [client_id, title, description || null, start_date || null],
      );

      return success(res, rows[0], 201);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /projects/:id — admin only */
projectsRouter.patch(
  "/:id",
  requireAuth,
  adminOnly,
  async (req: AuthRequest, res, next) => {
    try {
      const { title, description, status, launch_date, site_url } = req.body;
      const validStatuses = [
        "discovery",
        "design",
        "development",
        "review",
        "live",
        "maintenance",
      ];

      if (status && !validStatuses.includes(status)) {
        return error(
          res,
          `status must be one of: ${validStatuses.join(", ")}`,
        );
      }

      const { rows } = await pool.query(
        `UPDATE projects
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             launch_date = COALESCE($4, launch_date),
             site_url = COALESCE($5, site_url),
             updated_at = now()
         WHERE id = $6
         RETURNING *`,
        [
          title || null,
          description || null,
          status || null,
          launch_date || null,
          site_url || null,
          req.params.id,
        ],
      );

      if (rows.length === 0) return error(res, "Project not found", 404);
      return success(res, rows[0]);
    } catch (err) {
      next(err);
    }
  },
);
