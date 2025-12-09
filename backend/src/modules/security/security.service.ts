// backend/src/modules/security/security.service.ts

import { prisma } from '../../config/database';
import type { SystemState, User } from '@prisma/client';
import { SecurityEventType } from '@prisma/client';

/**
 * Ensure the SystemState singleton row exists.
 * Always uses id = 1.
 */
export async function ensureSystemState(): Promise<SystemState> {
  const system = await prisma.systemState.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      globalLock: false, // ✅ CORRECT FIELD NAME
    },
  });

  return system;
}

/**
 * Read current global system state.
 */
export async function getSystemState(): Promise<SystemState> {
  return ensureSystemState();
}

// ---------------- GLOBAL LOCK ----------------

interface SetGlobalLockParams {
  enabled: boolean;
  reason: string;
  actorLabel?: string;
}

/**
 * Turn the global KillSwitch ON or OFF and log a security event.
 */
export async function setGlobalLock(
  params: SetGlobalLockParams,
): Promise<SystemState> {
  const { enabled, reason, actorLabel } = params;
  const now = new Date();

  // 1) Update System State
  const system = await prisma.systemState.update({
    where: { id: 1 },
    data: {
      globalLock: enabled,     // ✅ CORRECT FIELD
      lastChangedAt: now,
    },
  });

  // 2) Select correct enum
  const eventType = enabled
    ? SecurityEventType.GLOBAL_LOCK_ENABLED
    : SecurityEventType.GLOBAL_LOCK_DISABLED;

  // 3) Immutable audit log
  await prisma.securityEvent.create({
    data: {
      type: eventType,        // ✅ REQUIRED ENUM FIELD
      reason,
      userId: null,
      metadata: {
        enabled,
        actorLabel: actorLabel ?? 'admin-api-secret',
      },
    },
  });

  return system;
}

// ---------------- USER FREEZE ----------------

interface UserFreezeParams {
  userId: string;
  reason: string;
  actorLabel?: string;
}

export async function freezeUser(params: UserFreezeParams): Promise<User> {
  const { userId, reason, actorLabel } = params;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isFrozen: true },
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
    data: { isFrozen: false },
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
 * Startup bootstrap
 */
export async function bootstrapSecurityLayer(): Promise<void> {
  await ensureSystemState();
  console.log('[KillSwitch] Security layer bootstrapped');
}











