import type { Bindings } from "../../worker-configuration";

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
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `projects/${projectId}/${id}-${safeName}`;

  await env.FILES.put(key, body, {
    httpMetadata: {
      contentType: contentType || "application/octet-stream",
      contentDisposition: `attachment; filename="${safeName}"`,
    },
  });

  return key;
}

/**
 * Stream a file directly from R2 through the Worker.
 *
 * R2 doesn't expose Cloudflare-issued presigned URLs to bound buckets, so we
 * proxy reads through the Worker. The request is already authenticated by
 * `requireAuth` upstream, which is the access boundary we want anyway.
 */
export async function getFileResponse(
  env: Bindings,
  storagePath: string,
): Promise<Response> {
  const obj = await env.FILES.get(storagePath);
  if (!obj) return new Response("File not found", { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);

  return new Response(obj.body, { headers });
}

/** Delete a file from R2. */
export async function deleteFile(env: Bindings, storagePath: string): Promise<void> {
  await env.FILES.delete(storagePath);
}
