import type { Request, Response, NextFunction } from "express";
import { getAuth } from "firebase-admin/auth";
import { initFirebase } from "../services/firebase.js";

export interface AuthRequest extends Request {
  uid?: string;
  role?: "admin" | "client";
}

/**
 * Verify Firebase JWT from Authorization header.
 * Attaches uid and role to the request.
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  initFirebase();

  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = header.slice(7);

  try {
    const decoded = await getAuth().verifyIdToken(token);
    req.uid = decoded.uid;
    req.role =
      decoded.uid === process.env.ADMIN_FIREBASE_UID ? "admin" : "client";
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
