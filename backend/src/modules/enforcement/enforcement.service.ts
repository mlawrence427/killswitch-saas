// backend/src/modules/enforcement/enforcement.service.ts
import { prisma } from '../../config/database';
import { SecurityEventType } from '@prisma/client';
import { getSystemState } from '../security/security.service';

export type AccessStatus = 'allowed' | 'denied';

export type AccessDeniedReason =
  | 'GLOBAL_LOCK'
  | 'USER_NOT_FOUND'
  | 'USER_FROZEN'
  | 'NO_ACCESS_FLAG';

export interface AccessDecision {
  status: AccessStatus;
  reason: AccessDeniedReason | 'OK';
  effectiveAt: string;
}

async function logAccessDenied(opts: {
  userId?: string;
  reason: AccessDeniedReason;
  context?: Record<string, unknown>;
}) {
  const { userId, reason, context } = opts;

  await prisma.securityEvent.create({
    data: {
      type: SecurityEventType.ACCESS_DENIED,
      userId,
      reason,
      metadata: context ?? undefined,
    },
  });
}

export async function checkAccess(userId: string): Promise<AccessDecision> {
  const now = new Date().toISOString();

  const system = await getSystemState();
  if (system.globalLock) {
    await logAccessDenied({
      userId,
      reason: 'GLOBAL_LOCK',
      context: { globalLock: true },
    });

    return {
      status: 'denied',
      reason: 'GLOBAL_LOCK',
      effectiveAt: now,
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    await logAccessDenied({ userId, reason: 'USER_NOT_FOUND' });

    return {
      status: 'denied',
      reason: 'USER_NOT_FOUND',
      effectiveAt: now,
    };
  }

  if (user.isFrozen) {
    await logAccessDenied({ userId, reason: 'USER_FROZEN' });

    return {
      status: 'denied',
      reason: 'USER_FROZEN',
      effectiveAt: now,
    };
  }

  if (!user.hasAccess) {
    await logAccessDenied({ userId, reason: 'NO_ACCESS_FLAG' });

    return {
      status: 'denied',
      reason: 'NO_ACCESS_FLAG',
      effectiveAt: now,
    };
  }

  return {
    status: 'allowed',
    reason: 'OK',
    effectiveAt: now,
  };
}



