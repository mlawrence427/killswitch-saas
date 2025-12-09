// backend/src/modules/security/security.routes.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/adminAuth';
import {
  getSystemState,
  setGlobalLock,
  freezeUser,
  unfreezeUser,
  listSecurityEvents,
} from './security.service';

export const securityRouter = Router();

// Helper to grab some "actor" label from the request.
// For now, we just capture the fact it's the header-based admin.
function getActorLabel(req: Request): string {
  const fromHeader = req.header('x-admin-label');
  return fromHeader ?? 'admin-api-secret';
}

/**
 * GET /api/security/state
 * Returns the current global lock state.
 */
securityRouter.get('/state', requireAdmin, async (_req, res: Response) => {
  try {
    const state = await getSystemState();
    res.json({
      globalLock: state.globalLock,
      lastChangedAt: state.lastChangedAt,
    });
  } catch (err) {
    console.error('Error fetching system state', err);
    res.status(500).json({ error: 'Failed to fetch system state' });
  }
});

/**
 * POST /api/security/global-lock
 * Body: { enabled: boolean, reason: string }
 */
securityRouter.post(
  '/global-lock',
  requireAdmin,
  async (req: Request, res: Response) => {
    const schema = z.object({
      enabled: z.boolean(),
      reason: z.string().min(3, 'Reason is required'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: parsed.error.format(),
      });
    }

    const { enabled, reason } = parsed.data;

    try {
      const updated = await setGlobalLock({
        enabled,
        reason,
        actorLabel: getActorLabel(req),
      });

      res.json({
        globalLock: updated.globalLock,
        lastChangedAt: updated.lastChangedAt,
      });
    } catch (err) {
      console.error('Error setting global lock', err);
      res.status(500).json({ error: 'Failed to update global lock' });
    }
  }
);

/**
 * POST /api/security/freeze-user
 * Body: { userId: string, reason: string }
 */
securityRouter.post(
  '/freeze-user',
  requireAdmin,
  async (req: Request, res: Response) => {
    const schema = z.object({
      userId: z.string().min(1),
      reason: z.string().min(3),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: parsed.error.format(),
      });
    }

    const { userId, reason } = parsed.data;

    try {
      const user = await freezeUser({
        userId,
        reason,
        actorLabel: getActorLabel(req),
        isAuto: false,
      });

      res.json({
        userId: user.id,
        isFrozen: user.isFrozen,
        hasAccess: user.hasAccess,
      });
    } catch (err) {
      console.error('Error freezing user', err);
      res.status(500).json({ error: 'Failed to freeze user' });
    }
  }
);

/**
 * POST /api/security/unfreeze-user
 * Body: { userId: string, reason: string }
 */
securityRouter.post(
  '/unfreeze-user',
  requireAdmin,
  async (req: Request, res: Response) => {
    const schema = z.object({
      userId: z.string().min(1),
      reason: z.string().min(3),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid payload',
        details: parsed.error.format(),
      });
    }

    const { userId, reason } = parsed.data;

    try {
      const user = await unfreezeUser({
        userId,
        reason,
        actorLabel: getActorLabel(req),
        isAuto: false,
      });

      res.json({
        userId: user.id,
        isFrozen: user.isFrozen,
        hasAccess: user.hasAccess,
      });
    } catch (err) {
      console.error('Error unfreezing user', err);
      res.status(500).json({ error: 'Failed to unfreeze user' });
    }
  }
);

/**
 * GET /api/security/logs?limit=100
 * Returns the most recent security events.
 */
securityRouter.get(
  '/logs',
  requireAdmin,
  async (req: Request, res: Response) => {
    const limitRaw = req.query.limit;
    const limit = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : 100;

    try {
      const events = await listSecurityEvents(isNaN(limit) ? 100 : limit);

      res.json(
        events.map((e) => ({
          id: e.id,
          type: e.type,
          userId: e.userId,
          reason: e.reason,
          metadata: e.metadata,
          createdAt: e.createdAt,
        }))
      );
    } catch (err) {
      console.error('Error fetching security logs', err);
      res.status(500).json({ error: 'Failed to fetch security logs' });
    }
  }
);



