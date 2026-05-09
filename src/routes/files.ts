import { Hono } from "hono";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import type { Bindings, Variables } from "../../worker-configuration";
import { getDb, schema, type Db } from "../db/client";
import { requireAuth } from "../middleware/auth";
import { error, success } from "../utils/response";
import { getFileResponse, uploadFile } from "../services/storage";

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
  if (!projectId) return error(c, "project_id query parameter is required");

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
  const db = getDb(c.env);

  const [file] = await db
    .select({
      ...getTableColumns(schema.files),
      authUid: schema.clients.authUid,
    })
    .from(schema.files)
    .innerJoin(schema.projects, eq(schema.projects.id, schema.files.projectId))
    .innerJoin(schema.clients, eq(schema.clients.id, schema.projects.clientId))
    .where(eq(schema.files.id, c.req.param("id")))
    .limit(1);

  if (!file) return error(c, "File not found", 404);
  if (c.var.role !== "admin" && file.authUid !== c.var.uid) {
    return error(c, "Access denied", 403);
  }

  return getFileResponse(c.env, file.storagePath);
});

/**
 * POST /files — upload a file (multipart/form-data).
 * Fields: project_id, file
 */
filesRouter.post("/", requireAuth, async (c) => {
  const form = await c.req.formData().catch(() => null);
  if (!form) return error(c, "Expected multipart/form-data");

  const projectId = form.get("project_id");
  const upload = form.get("file");

  if (typeof projectId !== "string") {
    return error(c, "project_id is required");
  }
  if (!(upload instanceof File)) {
    return error(c, "file is required");
  }

  const db = getDb(c.env);
  if (!(await verifyProjectAccess(db, projectId, c.var.uid, c.var.role))) {
    return error(c, "Access denied", 403);
  }

  const buffer = await upload.arrayBuffer();
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
