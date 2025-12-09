// backend/src/middleware/adminAuth.ts
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Simple header-based admin auth.
 * Clients must send:  x-admin-secret: <KILLSWITCH_API_KEY>
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const header = req.header('x-admin-secret');

  if (!header || header !== env.KILLSWITCH_API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized – invalid admin secret',
    });
  }

  return next();
}

