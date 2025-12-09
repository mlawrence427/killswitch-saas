// backend/src/modules/security/security.service.ts
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import type { SystemState, User, SecurityEvent } from '@prisma/client';

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
  params: SetGlobalLockParams
): Promise<SystemState> {
  const { enabled, reason, actorLabel } = params;
  const now = new Date();

  const system = await prisma.systemState.update({
    where: { id: 1 },
    data: {
      globalLock: enabled,
      lastChangedAt: now,
    },
  });

  await prisma.securityEvent.create({
    data: {
      type: 'GLOBAL_LOCK_CHANGED',
      reason,
      userId: actorLabel, // storing the label in userId for now
      metadata: {
        enabled,
        actorLabel,
      },
    },
  });

  return system;
}

interface FreezeUserParams {
  userId: string;
  reason: string;
  actorLabel?: string;
  isAuto: boolean;
}

export async function freezeUser(params: FreezeUserParams): Promise<User> {
  const { userId, reason, actorLabel, isAuto } = params;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isFrozen: true,
    },
  });

  await prisma.securityEvent.create({
    data: {
      type: isAuto ? 'AUTO_FREEZE' : 'MANUAL_FREEZE',
      userId: user.id,
      reason,
      metadata: {
        actorLabel,
      },
    },
  });

  return user;
}

interface UnfreezeUserParams {
  userId: string;
  reason: string;
  actorLabel?: string;
  isAuto: boolean;
}

export async function unfreezeUser(params: UnfreezeUserParams): Promise<User> {
  const { userId, reason, actorLabel, isAuto } = params;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isFrozen: false,
    },
  });

  await prisma.securityEvent.create({
    data: {
      type: isAuto ? 'AUTO_UNFREEZE' : 'MANUAL_UNFREEZE',
      userId: user.id,
      reason,
      metadata: {
        actorLabel,
      },
    },
  });

  return user;
}

/**
 * List recent security events (for logs endpoint).
 */
export async function listSecurityEvents(
  limit = 100
): Promise<SecurityEvent[]> {
  return prisma.securityEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * One-time bootstrap on server start:
 * - ensure SystemState exists
 * - ensure a default admin exists (by email)
 */
export async function bootstrapSecurityLayer(): Promise<void> {
  await ensureSystemState();

  const existingAdmin = await prisma.user.findFirst({
    where: { isAdmin: true },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        email: env.ADMIN_DEFAULT_EMAIL,
        passwordHash: env.ADMIN_DEFAULT_PASSWORD, // in a real app, hash this!
        isAdmin: true,
        hasAccess: true,
      },
    });

    await prisma.securityEvent.create({
      data: {
        type: 'ADMIN_BOOTSTRAP',
        userId: admin.id,
        reason: 'Default admin created on first boot',
        metadata: {
          email: env.ADMIN_DEFAULT_EMAIL,
        },
      },
    });

    console.log(
      `[KillSwitch] Default admin created: ${env.ADMIN_DEFAULT_EMAIL} / ${env.ADMIN_DEFAULT_PASSWORD}`
    );
  }

  console.log('[KillSwitch] Security layer bootstrapped');
}



