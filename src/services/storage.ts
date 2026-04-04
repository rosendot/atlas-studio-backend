import { Storage } from "@google-cloud/storage";

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET || "";

function getBucket() {
  if (!bucketName) throw new Error("GCS_BUCKET env var is required");
  return storage.bucket(bucketName);
}

/** Upload a buffer to GCS and return the storage path */
export async function uploadFile(
  buffer: Buffer,
  filename: string,
  projectId: string,
  contentType?: string,
): Promise<string> {
  const storagePath = `projects/${projectId}/${Date.now()}-${filename}`;
  const bucket = getBucket();
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: { contentType: contentType || "application/octet-stream" },
  });

  return storagePath;
}

/** Generate a signed download URL (valid 1 hour) */
export async function getSignedUrl(storagePath: string): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(storagePath);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000,
  });

  return url;
}
