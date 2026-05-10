import { Hono } from "hono";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema, type Db } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { isUuid } from "../utils/validate";
import { error, success } from "../utils/response";
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  deleteFile as deleteR2File,
  getFileResponse,
  isAllowedMime,
  uploadFile,
} from "../services/storage";

export const filesRouter = new Hono<{ Bindings: Bindings; Variables: Variables }>();

async function verifyProjectAccess(
  db: Db,
  projectId: string,
  uid: string,
  role: "admin" | "client",
): Promise<boolean> {
  if (role === "admin") return true;

  const [row] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(
      and(eq(schema.projects.id, projectId), eq(schema.clients.authUid, uid)),
    )
    .limit(1);
  return !!row;
}

/** GET /files?project_id=xxx — list files for a project */
filesRouter.get("/", requireAuth, async (c) => {
  const projectId = c.req.query("project_id");
  if (!projectId || !isUuid(projectId)) {
    return error(c, "Valid project_id query parameter is required");
  }

  const db = getDb(c.env);
  if (!(await verifyProjectAccess(db, projectId, c.var.uid, c.var.role))) {
    return error(c, "Access denied", 403);
  }

  const rows = await db
    .select()
    .from(schema.files)
    .where(eq(schema.files.projectId, projectId))
    .orderBy(desc(schema.files.createdAt));

  return success(c, rows);
});

/**
 * GET /files/:id/download — stream the file from R2 through the Worker.
 *
 * R2 doesn't expose presigned URLs to bound buckets, so we proxy reads.
 * Authentication has already happened in `requireAuth`; this is the access boundary.
 */
filesRouter.get("/:id/download", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return error(c, "Invalid file id", 400);
  const db = getDb(c.env);

  const [file] = await db
    .select({
      ...getTableColumns(schema.files),
      authUid: schema.clients.authUid,
    })
    .from(schema.files)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.files.projectId))
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(eq(schema.files.id, id))
    .limit(1);

  if (!file) return error(c, "File not found", 404);
  if (c.var.role !== "admin" && file.authUid !== c.var.uid) {
    return error(c, "Access denied", 403);
  }

  return getFileResponse(c.env, file.storagePath, file.filename);
});

/**
 * DELETE /files/:id — remove a file from R2 and the database.
 * Admin can delete any file; clients can delete files on their own projects.
 */
filesRouter.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  if (!isUuid(id)) return error(c, "Invalid file id", 400);

  const db = getDb(c.env);

  const [file] = await db
    .select({
      id: schema.files.id,
      storagePath: schema.files.storagePath,
      authUid: schema.clients.authUid,
    })
    .from(schema.files)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.files.projectId))
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(eq(schema.files.id, id))
    .limit(1);

  if (!file) return error(c, "File not found", 404);
  if (c.var.role !== "admin" && file.authUid !== c.var.uid) {
    return error(c, "Access denied", 403);
  }

  // Delete from DB first — if R2 delete fails, we'd rather have an orphan R2
  // object than a database row pointing at a missing file.
  await db.delete(schema.files).where(eq(schema.files.id, id));
  await deleteR2File(c.env, file.storagePath).catch((err) =>
    console.error("R2 delete failed:", err.name, err.message),
  );

  return success(c, { id });
});

/**
 * POST /files — upload a file (multipart/form-data).
 * Fields: project_id, file
 */
filesRouter.post("/", requireAuth, async (c) => {
  // Reject oversized requests before reading the form. Content-Length is a
  // hint (not authoritative), so we also check the actual file below.
  const contentLength = Number(c.req.header("content-length") || 0);
  if (contentLength > MAX_UPLOAD_BYTES) {
    return error(c, `File too large (max ${MAX_UPLOAD_BYTES} bytes)`, 413);
  }

  const form = await c.req.formData().catch(() => null);
  if (!form) return error(c, "Expected multipart/form-data");

  const projectId = form.get("project_id");
  const upload = form.get("file");

  if (!isUuid(projectId)) {
    return error(c, "Valid project_id is required");
  }
  if (!(upload instanceof File)) {
    return error(c, "file is required");
  }
  if (upload.size > MAX_UPLOAD_BYTES) {
    return error(c, `File too large (max ${MAX_UPLOAD_BYTES} bytes)`, 413);
  }
  if (!isAllowedMime(upload.type)) {
    return error(
      c,
      `Unsupported file type. Allowed: ${[...ALLOWED_MIME_TYPES].join(", ")}`,
    );
  }

  const db = getDb(c.env);
  if (!(await verifyProjectAccess(db, projectId, c.var.uid, c.var.role))) {
    return error(c, "Access denied", 403);
  }

  const buffer = await upload.arrayBuffer();
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return error(c, `File too large (max ${MAX_UPLOAD_BYTES} bytes)`, 413);
  }

  const storagePath = await uploadFile(
    c.env,
    buffer,
    upload.name,
    projectId,
    upload.type,
  );

  const [record] = await db
    .insert(schema.files)
    .values({
      projectId,
      uploadedBy: c.var.uid,
      filename: upload.name,
      storagePath,
      fileType: upload.type || null,
      sizeBytes: buffer.byteLength,
    })
    .returning();

  return success(c, record, 201);
});
