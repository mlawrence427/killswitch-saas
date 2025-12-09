// backend/src/modules/security/security.service.ts
import { prisma } from '../../config/database';
import { SecurityEventType, SystemState, User, SecurityEvent } from '@prisma/client';

/**
 * Ensure the SystemState singleton row exists.
 * We always use id = 1 for the global system state.
 */
export async function ensureSystemState(): Promise<SystemState> {
  return prisma.systemState.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      globalLock: false,
    },
  });
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
  actorLabel?: string; // e.g. "admin-api-key" or future admin id/email
}

/**
 * Toggle the global lock flag and log a security event.
 */
export async function setGlobalLock(
  params: SetGlobalLockParams
): Promise<SystemState> {
  const { enabled, reason, actorLabel } = params;

  // Ensure singleton exists before update
  await ensureSystemState();

  const updated = await prisma.systemState.update({
    where: { id: 1 },
    data: {
      globalLock: enabled,
      lastChangedAt: new Date(),
    },
  });

  await prisma.securityEvent.create({
    data: {
      type: enabled
        ? SecurityEventType.GLOBAL_LOCK_ON
        : SecurityEventType.GLOBAL_LOCK_OFF,
      reason,
      metadata: actorLabel ? { actorLabel } : undefined,
    },
  });

  return updated;
}

interface FreezeUserParams {
  userId: string;
  reason: string;
  actorLabel?: string;
  isAuto?: boolean; // true if triggered by Stripe / automation
}

/**
 * Freeze a single user (per-user kill switch).
 */
export async function freezeUser(
  params: FreezeUserParams
): Promise<User> {
  const { userId, reason, actorLabel, isAuto } = params;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isFrozen: true,
      hasAccess: false,
    },
  });

  await prisma.securityEvent.create({
    data: {
      type: isAuto
        ? SecurityEventType.AUTO_FRAUD_LOCK
        : SecurityEventType.USER_FROZEN,
      userId: user.id,
      reason,
      metadata: actorLabel ? { actorLabel } : undefined,
    },
  });

  return user;
}

interface UnfreezeUserParams {
  userId: string;
  reason: string;
  actorLabel?: string;
  isAuto?: boolean;
}

/**
 * Unfreeze a user (restore access subject to your app logic).
 */
export async function unfreezeUser(
  params: UnfreezeUserParams
): Promise<User> {
  const { userId, reason, actorLabel, isAuto } = params;

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      isFrozen: false,
      // We DO NOT automatically set hasAccess=true here -
      // that should follow your business rules. For now
      // we leave it as whatever it already was.
    },
  });

  await prisma.securityEvent.create({
    data: {
      type: isAuto
        ? SecurityEventType.AUTO_FRAUD_UNLOCK
        : SecurityEventType.USER_UNFROZEN,
      userId: user.id,
      reason,
      metadata: actorLabel ? { actorLabel } : undefined,
    },
  });

  return user;
}

/**
 * List recent security events for the log view.
 */
export async function listSecurityEvents(limit = 100): Promise<SecurityEvent[]> {
  return prisma.securityEvent.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

/**
 * Called on server startup to ensure critical security state exists.
 */
export async function bootstrapSecurityLayer(): Promise<void> {
  await ensureSystemState();
  // In the future, you can also seed an initial admin here.
}
