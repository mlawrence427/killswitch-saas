// backend/src/middleware/adminAuth.ts
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Very simple v0 admin guard:
 * - Requires header: x-admin-secret
 * - Must match ADMIN_DEFAULT_PASSWORD from env
 *
 * This is intentionally minimal for early development and should
 * later be replaced with a proper auth system (JWT / sessions).
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const provided = req.header('x-admin-secret');

  if (!provided) {
    return res.status(401).json({
      error: 'Missing admin secret',
    });
  }

  if (provided !== env.ADMIN_DEFAULT_PASSWORD) {
    return res.status(401).json({
      error: 'Invalid admin secret',
    });
  }

  // In the future we can attach an admin identity:
  // (req as any).adminId = ...
  next();
}
