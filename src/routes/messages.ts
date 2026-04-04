import { Router } from "express";
import pool from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { missingField } from "../utils/validate.js";
import { success, error } from "../utils/response.js";

export const messagesRouter = Router();

/** Verify the requesting user has access to the given project */
async function verifyProjectAccess(
  projectId: string,
  uid: string,
  role: string,
): Promise<boolean> {
  if (role === "admin") return true;

  const { rows } = await pool.query(
    `SELECT 1 FROM projects p
     JOIN clients c ON c.id = p.client_id
     WHERE p.id = $1 AND c.firebase_uid = $2`,
    [projectId, uid],
  );
  return rows.length > 0;
}

/** GET /messages?project_id=xxx — get conversation thread */
messagesRouter.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) return error(res, "project_id query parameter is required");

    if (!(await verifyProjectAccess(projectId, req.uid!, req.role!))) {
      return error(res, "Access denied", 403);
    }

    const { rows } = await pool.query(
      "SELECT * FROM messages WHERE project_id = $1 ORDER BY created_at ASC",
      [projectId],
    );

    // Mark unread messages as read for this user
    await pool.query(
      `UPDATE messages SET read_at = now()
       WHERE project_id = $1 AND sender_uid != $2 AND read_at IS NULL`,
      [projectId, req.uid],
    );

    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

/** POST /messages — send a message */
messagesRouter.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const missing = missingField(req.body, ["project_id", "body"]);
    if (missing) return error(res, `${missing} is required`);

    const { project_id, body } = req.body;

    if (!(await verifyProjectAccess(project_id, req.uid!, req.role!))) {
      return error(res, "Access denied", 403);
    }

    const { rows } = await pool.query(
      `INSERT INTO messages (project_id, sender_uid, sender_role, body)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [project_id, req.uid, req.role, body],
    );

    return success(res, rows[0], 201);
  } catch (err) {
    next(err);
  }
});
