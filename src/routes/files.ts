import { Router } from "express";
import pool from "../db/client.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { missingField } from "../utils/validate.js";
import { success, error } from "../utils/response.js";
import { uploadFile, getSignedUrl } from "../services/storage.js";

export const filesRouter = Router();

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

/** GET /files?project_id=xxx — list files for a project */
filesRouter.get("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const projectId = req.query.project_id as string;
    if (!projectId) return error(res, "project_id query parameter is required");

    if (!(await verifyProjectAccess(projectId, req.uid!, req.role!))) {
      return error(res, "Access denied", 403);
    }

    const { rows } = await pool.query(
      "SELECT * FROM files WHERE project_id = $1 ORDER BY created_at DESC",
      [projectId],
    );

    return success(res, rows);
  } catch (err) {
    next(err);
  }
});

/** GET /files/:id/download — get a signed download URL */
filesRouter.get(
  "/:id/download",
  requireAuth,
  async (req: AuthRequest, res, next) => {
    try {
      const { rows } = await pool.query(
        `SELECT f.*, c.firebase_uid
       FROM files f
       JOIN projects p ON p.id = f.project_id
       JOIN clients c ON c.id = p.client_id
       WHERE f.id = $1`,
        [req.params.id],
      );

      if (rows.length === 0) return error(res, "File not found", 404);

      const file = rows[0];
      if (req.role !== "admin" && file.firebase_uid !== req.uid) {
        return error(res, "Access denied", 403);
      }

      const url = await getSignedUrl(file.storage_path);
      return success(res, { url });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /files — upload a file
 * Expects JSON body with base64-encoded file content.
 * For production, switch to multipart/form-data with multer.
 */
filesRouter.post("/", requireAuth, async (req: AuthRequest, res, next) => {
  try {
    const missing = missingField(req.body, [
      "project_id",
      "filename",
      "content",
    ]);
    if (missing) return error(res, `${missing} is required`);

    const { project_id, filename, content, content_type } = req.body;

    if (!(await verifyProjectAccess(project_id, req.uid!, req.role!))) {
      return error(res, "Access denied", 403);
    }

    const buffer = Buffer.from(content, "base64");
    const storagePath = await uploadFile(
      buffer,
      filename,
      project_id,
      content_type,
    );

    const { rows } = await pool.query(
      `INSERT INTO files (project_id, uploaded_by, filename, storage_path, file_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        project_id,
        req.uid,
        filename,
        storagePath,
        content_type || null,
        buffer.length,
      ],
    );

    return success(res, rows[0], 201);
  } catch (err) {
    next(err);
  }
});
