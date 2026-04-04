import type { Response, NextFunction } from "express";
import type { AuthRequest } from "./auth.js";

/**
 * Restrict route to admin only. Must be used after requireAuth.
 */
export function adminOnly(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}
