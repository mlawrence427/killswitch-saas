// backend/src/config/database.ts
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// Optional helper if you ever want to explicitly connect on startup
export async function connectDatabase() {
  await prisma.$connect();
}

