// backend/src/modules/security/security.routes.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/adminAuth';
import {
  getSystemState,
  setGlobalLock,
  freezeUser,
  unfreezeUser,
} from './security.service';

export const securityRouter = Router();

/**
 * Helper to grab an "actor" label from the request.
 * For now, we just capture that it's the header-based admin.
 */
function getActorLabel(req: Request): string {
  const fromHeader = req.header('x-admin-label');
  return fromHeader ?? 'admin-api-secret';
}

/**
 * GET /api/security/state
 * Returns the current global lock state.
 */
securityRouter.get(
  '/state',
  requireAdmin,
  async (_req: Request, res: Response) => {
    try {
      const state = await getSystemState();
      res.json({
        id: state.id,
        globalLock: state.globalLock,
        lastChangedAt: state.lastChangedAt,
      });
    } catch (err) {
      console.error('Error fetching system state', err);
      res.status(500).json({ error: 'Failed to fetch system state' });
    }
  },
);

/**
 * POST /api/security/global-lock
 * Body: { enabled: boolean, reason: string }
 */
const globalLockSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().min(1),
});

securityRouter.post(
  '/global-lock',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = globalLockSchema.parse(req.body);
      const actorLabel = getActorLabel(req);

      const state = await setGlobalLock({
        enabled: parsed.enabled,
        reason: parsed.reason,
        actorLabel,
      });

      res.json({
        id: state.id,
        globalLock: state.globalLock,
        lastChangedAt: state.lastChangedAt,
      });
    } catch (err) {
      console.error('Failed to update global lock:', err);
      res.status(500).json({
        error: 'Failed to update global lock',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

/**
 * POST /api/security/users/:userId/freeze
 * Body: { reason: string }
 */
const userFreezeSchema = z.object({
  reason: z.string().min(1),
});

securityRouter.post(
  '/users/:userId/freeze',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const parsed = userFreezeSchema.parse(req.body);
      const actorLabel = getActorLabel(req);

      const user = await freezeUser({
        userId,
        reason: parsed.reason,
        actorLabel,
      });

      res.json({
        id: user.id,
        isFrozen: user.isFrozen,
        hasAccess: user.hasAccess,
      });
    } catch (err) {
      console.error('Failed to freeze user:', err);
      res.status(500).json({
        error: 'Failed to freeze user',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  },
);

/**
 * POST /api/security/users/:userId/unfreeze
 * Body: { reason: string }
 */
securityRouter.post(
  '/users/:userId/unfreeze',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const parsed = userFreezeSchema.parse(req.body);
      const actorLabel = getActorLabel(req);

      const user = await unfreezeUser({
        userId,
        reason: parsed.reason,
        actorLabel,
      });

      res.json({
        id: user.id,
        isFrozen: user.isFrozen,
        hasAccess: user.hasAccess,
      });
    } catch (err) {
      console.error('Failed to unfreeze user:', err);
      res.status(500).json({
        error: 'Failed to unfreeze user',
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  },
);




