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

// ---- Validation Schemas ----
const globalLockSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().min(1),
  actorLabel: z.string().optional(),
});

const userFreezeSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1),
  actorLabel: z.string().optional(),
});

// ---- Routes ----

// GET /api/security/state
securityRouter.get('/state', requireAdmin, async (req: Request, res: Response) => {
  try {
    const state = await getSystemState();
    res.json(state);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to read system state' });
  }
});

// POST /api/security/global-lock
securityRouter.post('/global-lock', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = globalLockSchema.parse(req.body);
    const updated = await setGlobalLock(parsed);   // <-- THIS WAS THE missing link

    res.json({
      ok: true,
      globalLock: updated.globalLock,
      lastChangedAt: updated.lastChangedAt,
    });

  } catch (err) {
    console.error('Failed to update global lock:', err);
    res.status(500).json({ error: 'Failed to update global lock' });
  }
});

// POST /api/security/freeze
securityRouter.post('/freeze', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = userFreezeSchema.parse(req.body);
    const updated = await freezeUser(parsed);

    res.json({ ok: true, freeze: updated });
  } catch (err) {
    console.error('Freeze failed:', err);
    res.status(500).json({ error: 'Failed to freeze user' });
  }
});

// POST /api/security/unfreeze
securityRouter.post('/unfreeze', requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = userFreezeSchema.parse(req.body);
    const updated = await unfreezeUser(parsed);

    res.json({ ok: true, unfreeze: updated });
  } catch (err) {
    console.error('Unfreeze failed:', err);
    res.status(500).json({ error: 'Failed to unfreeze user' });
  }
});



