import { Router } from "express";
import pool from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { adminOnly } from "../middleware/adminOnly.js";
import { missingField } from "../utils/validate.js";
import { success, error } from "../utils/response.js";
import { notifyMilestoneComplete } from "../services/notifications.js";

export const milestonesRouter = Router();

/**
 * GET /projects/:projectId/milestones — handled via projectsRouter redirect,
 * but we also support GET /milestones?project_id=xxx for flexibility.
 */
milestonesRouter.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) return error(res, "project_id query parameter is required");

    // Verify access
    const { rows: projects } = await pool.query(
      `SELECT p.id, c.firebase_uid
       FROM projects p
       JOIN clients c ON c.id = p.client_id
       WHERE p.id = $1`,
      [projectId],
    );

    if (projects.length === 0) return error(res, "Project not found", 404);
    if (req.role !== "admin" && projects[0].firebase_uid !== req.uid) {
      return error(res, "Access denied", 403);
    }

    const { rows } = await pool.query(
      "SELECT * FROM milestones WHERE project_id = $1 ORDER BY sort_order, created_at",
      [projectId],
    );

    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

/** POST /milestones — admin only, create a milestone */
milestonesRouter.post(
  "/",
  requireAuth,
  adminOnly,
  async (req: AuthRequest, res, next) => {
    try {
      const missing = missingField(req.body, ["project_id", "title"]);
      if (missing) return error(res, `${missing} is required`);

      const { project_id, title, description, due_date, sort_order } = req.body;

      const { rows } = await pool.query(
        `INSERT INTO milestones (project_id, title, description, due_date, sort_order)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          project_id,
          title,
          description || null,
          due_date || null,
          sort_order ?? 0,
        ],
      );

      return success(res, rows[0], 201);
    } catch (err) {
      next(err);
    }
  },
);

/** PATCH /milestones/:id — admin only, update milestone */
milestonesRouter.patch(
  "/:id",
  requireAuth,
  adminOnly,
  async (req: AuthRequest, res, next) => {
    try {
      const { title, description, status, due_date, sort_order } = req.body;
      const validStatuses = ["pending", "in_progress", "complete"];

      if (status && !validStatuses.includes(status)) {
        return error(
          res,
          `status must be one of: ${validStatuses.join(", ")}`,
        );
      }

      const completedAt = status === "complete" ? "now()" : null;

      const { rows } = await pool.query(
        `UPDATE milestones
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             status = COALESCE($3, status),
             due_date = COALESCE($4, due_date),
             sort_order = COALESCE($5, sort_order),
             completed_at = CASE WHEN $3 = 'complete' THEN now() ELSE completed_at END
         WHERE id = $6
         RETURNING *`,
        [
          title || null,
          description || null,
          status || null,
          due_date || null,
          sort_order ?? null,
          req.params.id,
        ],
      );

      if (rows.length === 0) return error(res, "Milestone not found", 404);

      // Notify client if milestone was marked complete
      if (status === "complete") {
        notifyMilestoneComplete(req.params.id as string).catch((err) =>
          console.error("Failed to send milestone notification:", err),
        );
      }

      return success(res, rows[0]);
    } catch (err) {
      next(err);
    }
  },
);
