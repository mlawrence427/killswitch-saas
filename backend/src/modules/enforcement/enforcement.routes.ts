// backend/src/modules/enforcement/enforcement.routes.ts
import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/adminAuth';
import { checkAccess, getEnforcementSnapshot } from './enforcement.service';

export const enforcementRouter = Router();

/**
 * POST /api/enforcement/check
 * Body: { userId: string }
 */
enforcementRouter.post('/check', requireAdmin, async (req: Request, res: Response) => {
  const { userId } = req.body ?? {};

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }

  try {
    const decision = await checkAccess(userId);
    res.json(decision);
  } catch (err) {
    console.error('Error during access check', err);
    res.status(500).json({ error: 'Failed to evaluate access' });
  }
});

/**
 * GET /api/enforcement/snapshot
 * Returns current globalLock + frozen/no-access user IDs.
 * Intended for SDKs to poll and cache locally.
 */
enforcementRouter.get('/snapshot', requireAdmin, async (_req: Request, res: Response) => {
  try {
    const snapshot = await getEnforcementSnapshot();
    res.json(snapshot);
  } catch (err) {
    console.error('Error fetching enforcement snapshot', err);
    res.status(500).json({ error: 'Failed to fetch enforcement snapshot' });
  }
});



