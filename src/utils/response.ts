import type { Response } from "express";

export function success(res: Response, data: unknown, status = 200) {
  return res.status(status).json({ data });
}

export function error(res: Response, message: string, status = 400) {
  return res.status(status).json({ error: message });
}
