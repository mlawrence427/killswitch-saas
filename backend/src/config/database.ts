// backend/src/config/database.ts
import { PrismaClient } from '@prisma/client';
import { isProd } from './env';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['error'] : ['query', 'error', 'warn'],
  });

if (!isProd) globalForPrisma.prisma = prisma;
