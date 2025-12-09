// backend/src/middleware/enforceKillSwitch.ts
import { Request, Response, NextFunction } from 'express';
import { checkAccess } from '../modules/enforcement/enforcement.service';

/**
 * This middleware is what CUSTOMER apps will use.
 * They pass their internal userId to KillSwitch via header.
 */
export async function enforceKillSwitch(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.header('x-user-id');

    if (!userId) {
      return res.status(401).json({
        error: 'Missing x-user-id header',
      });
    }

    const decision = await checkAccess(userId);

    if (decision.status === 'denied') {
      return res.status(403).json({
        blocked: true,
        reason: decision.reason,
        effectiveAt: decision.effectiveAt,
      });
    }

    // Allowed → hand off to the app’s handler
    return next();
  } catch (err) {
    console.error('KillSwitch enforcement failed:', err);
    return res.status(500).json({ error: 'KillSwitch enforcement error' });
  }
}

