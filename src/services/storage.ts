import type { Bindings } from "../../worker-configuration";

/** Max upload size in bytes (25 MB). */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Whitelist of MIME types the studio explicitly allows clients/admin to
 * upload. Anything outside this list is rejected — defends against stored
 * XSS (no HTML/SVG) and dangerous binaries.
 */
export const ALLOWED_MIME_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  // Images (no SVG — it can execute scripts)
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  // Video/audio (rare, but useful for client uploads of intro reels etc.)
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  // Archives
  "application/zip",
]);

export function isAllowedMime(type: string | null | undefined): boolean {
  return !!type && ALLOWED_MIME_TYPES.has(type);
}

/**
 * Upload a body to R2 under projects/<projectId>/<id>-<filename>.
 * Returns the storage key for the database record.
 */
export async function uploadFile(
  env: Bindings,
  body: ArrayBuffer | ReadableStream | Blob,
  filename: string,
  projectId: string,
  contentType?: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
  const key = `projects/${projectId}/${id}-${safeName}`;

  // Always store with octet-stream + attachment disposition. The download
  // handler overrides these anyway, but defense in depth.
  await env.FILES.put(key, body, {
    httpMetadata: {
      contentType: "application/octet-stream",
      contentDisposition: `attachment; filename="${safeName}"`,
    },
    customMetadata: contentType ? { originalContentType: contentType } : undefined,
  });

  return key;
}

/**
 * Stream a file from R2 through the Worker.
 *
 * Hardened headers:
 *   - Content-Type forced to application/octet-stream (never trust uploader)
 *   - Content-Disposition forced to attachment
 *   - X-Content-Type-Options: nosniff (no MIME sniffing in the browser)
 */
export async function getFileResponse(
  env: Bindings,
  storagePath: string,
  filename?: string,
): Promise<Response> {
  const obj = await env.FILES.get(storagePath);
  if (!obj) return new Response("File not found", { status: 404 });

  const safeName = (filename || storagePath.split("/").pop() || "file")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 200);

  const headers = new Headers();
  headers.set("Content-Type", "application/octet-stream");
  headers.set("Content-Disposition", `attachment; filename="${safeName}"`);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("etag", obj.httpEtag);

  return new Response(obj.body, { headers });
}

/** Delete a file from R2. */
export async function deleteFile(env: Bindings, storagePath: string): Promise<void> {
  await env.FILES.delete(storagePath);
}
