// backend/src/modules/enforcement/enforcement.service.ts
import { prisma } from '../../config/database';
import { SecurityEventType, User } from '@prisma/client';
import { getSystemState } from '../security/security.service';

/**
 * Result status for an access decision.
 */
export type AccessStatus = 'allowed' | 'denied';

/**
 * Reasons why access was denied.
 */
export type AccessDeniedReason =
  | 'GLOBAL_LOCK'
  | 'USER_NOT_FOUND'
  | 'USER_FROZEN'
  | 'NO_ACCESS_FLAG';

/**
 * Shape of the decision returned to calling apps.
 */
export interface AccessDecision {
  status: AccessStatus;
  reason: AccessDeniedReason | 'OK';
  effectiveAt: string; // ISO timestamp
}

/**
 * Internal helper to log ACCESS_DENIED events for observability / forensics.
 */
async function logAccessDenied(opts: {
  userId?: string;
  reason: AccessDeniedReason;
  context?: Record<string, unknown>;
}): Promise<void> {
  const { userId, reason, context } = opts;

  await prisma.securityEvent.create({
    data: {
      userId,
      reason,
      type: SecurityEventType.ACCESS_DENIED,
      metadata: context ?? undefined,
    },
  });
}

/**
 * Helper to build the common denied response.
 */
function denied(
  reason: AccessDeniedReason,
  effectiveAt: string
): AccessDecision {
  return {
    status: 'denied',
    reason,
    effectiveAt,
  };
}

/**
 * Core KillSwitch enforcement check.
 * This is what external SaaS apps will call.
 */
export async function checkAccess(userId: string): Promise<AccessDecision> {
  const effectiveAt = new Date().toISOString();

  // 1. Global lock — if flipped, nobody gets through.
  const system = await getSystemState();
  if (system.globalLock) {
    await logAccessDenied({
      userId,
      reason: 'GLOBAL_LOCK',
      context: { globalLock: true },
    });

    return denied('GLOBAL_LOCK', effectiveAt);
  }

  // 2. Look up the user being checked.
  const user: User | null = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    await logAccessDenied({
      userId,
      reason: 'USER_NOT_FOUND',
    });

    return denied('USER_NOT_FOUND', effectiveAt);
  }

  // 3. Explicit freeze flag.
  if (user.isFrozen) {
    await logAccessDenied({
      userId: user.id,
      reason: 'USER_FROZEN',
    });

    return denied('USER_FROZEN', effectiveAt);
  }

  // 4. Generic "no access" flag controlled by the founder's system.
  if (!user.hasAccess) {
    await logAccessDenied({
      userId: user.id,
      reason: 'NO_ACCESS_FLAG',
    });

    return denied('NO_ACCESS_FLAG', effectiveAt);
  }

  // 5. Everything is good.
  return {
    status: 'allowed',
    reason: 'OK',
    effectiveAt,
  };
}


