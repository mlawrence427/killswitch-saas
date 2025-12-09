// backend/src/modules/security/security.service.ts

import { prisma } from '../../config/database';
import type { SystemState, User } from '@prisma/client';
import { SecurityEventType } from '@prisma/client';

/**
 * Ensure the SystemState singleton row exists.
 * We always use id = 1 for the global system state.
 */
export async function ensureSystemState(): Promise<SystemState> {
  const system = await prisma.systemState.upsert({
    where: { id: 1 },
    update: {},
    create: {
  id: 1,
  globalLock: false,
   },
  });

  return system;
}

/**
 * Read the current system state (after ensuring it exists).
 */
export async function getSystemState(): Promise<SystemState> {
  return ensureSystemState();
}

interface SetGlobalLockParams {
  enabled: boolean;
  reason: string;
  actorLabel?: string; // optional human label for who did this
}

/**
 * Turn the global KillSwitch ON or OFF and log a security event.
 */
export async function setGlobalLock(
  params: SetGlobalLockParams,
): Promise<SystemState> {
  const { enabled, reason, actorLabel } = params;
  const now = new Date();

  const system = await prisma.systemState.update({
    where: { id: 1 },
    data: {
      // NOTE: field name matches Prisma model: "globalLock"
      globalLock: enabled,
      lastChangedAt: now,
    },
  });

  // Pick the correct enum based on the new state
  const eventType = enabled
    ? SecurityEventType.GLOBAL_LOCK_ENABLED
    : SecurityEventType.GLOBAL_LOCK_DISABLED;

  await prisma.securityEvent.create({
    data: {
      type: eventType,
      reason,
      userId: null, // system-level action
      metadata: {
        enabled,
        actorLabel,
      },
    },
  });

  return system;
}

// --- per-user freeze / unfreeze ---

interface UserFreezeParams {
  userId: string;
  reason: string;
  actorLabel?: string;
}

export async function freezeUser(params: UserFreezeParams): Promise<User> {
  const { userId, reason, actorLabel } = params;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isFrozen: true,
    },
  });

  await prisma.securityEvent.create({
    data: {
      type: SecurityEventType.USER_FROZEN,
      reason,
      userId,
      metadata: { actorLabel },
    },
  });

  return user;
}

export async function unfreezeUser(params: UserFreezeParams): Promise<User> {
  const { userId, reason, actorLabel } = params;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isFrozen: false,
    },
  });

  await prisma.securityEvent.create({
    data: {
      type: SecurityEventType.USER_UNFROZEN,
      reason,
      userId,
      metadata: { actorLabel },
    },
  });

  return user;
}

/**
 * Bootstrap helper called on server startup.
 * Ensures the core security layer is ready.
 */
export async function bootstrapSecurityLayer(): Promise<void> {
  // for now, just ensure the singleton row exists
  await ensureSystemState();

  // later we could pre-create a default admin, etc.
  console.log('[KillSwitch] Security layer bootstrapped');
}






