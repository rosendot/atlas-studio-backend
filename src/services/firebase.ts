import { initializeApp, cert, getApps } from "firebase-admin/app";

let initialized = false;

export function initFirebase() {
  if (initialized || getApps().length > 0) return;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is required");
  }

  initializeApp({
    credential: cert(JSON.parse(serviceAccount)),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  initialized = true;
}
