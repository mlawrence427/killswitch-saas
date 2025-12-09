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

/**
 * A compact snapshot that client SDKs can poll and cache locally.
 */
export interface EnforcementSnapshot {
  globalLock: boolean;
  frozenUserIds: string[];
  generatedAt: string; // ISO timestamp
}

// ... your existing logAccessDenied + checkAccess(...) here ...

/**
 * Snapshot of current enforcement state.
 * Client SDKs can poll this and make 100% local decisions.
 */
export async function getEnforcementSnapshot(): Promise<EnforcementSnapshot> {
  const [system, frozenUsers] = await Promise.all([
    getSystemState(),
    prisma.user.findMany({
      where: {
        OR: [
          { isFrozen: true },
          { hasAccess: false },
        ],
      },
      select: { id: true },
    }),
  ]);

  return {
    globalLock: system.globalLock,
    frozenUserIds: frozenUsers.map((u) => u.id),
    generatedAt: new Date().toISOString(),
  };
}





