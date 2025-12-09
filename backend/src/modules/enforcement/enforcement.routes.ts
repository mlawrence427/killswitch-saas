// backend/src/modules/enforcement/enforcement.routes.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAdmin } from '../../middleware/adminAuth';
import { checkAccess } from './enforcement.service';

export const enforcementRouter = Router();

const checkSchema = z.object({
  userId: z.string().min(1),
});

/**
 * POST /api/enforcement/check
 * This is what customer apps will call.
 */
enforcementRouter.post(
  '/check',
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const parsed = checkSchema.parse(req.body);
      const decision = await checkAccess(parsed.userId);

      res.json(decision);
    } catch (err) {
      console.error('Access check failed:', err);
      res.status(500).json({ error: 'Failed to check access' });
    }
  }
);


