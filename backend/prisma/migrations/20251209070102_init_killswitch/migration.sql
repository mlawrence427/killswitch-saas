/*
  Warnings:

  - The values [AUTO_FRAUD_UNLOCK] on the enum `SecurityEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `StripeEventLog` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SecurityEventType_new" AS ENUM ('GLOBAL_LOCK_ON', 'GLOBAL_LOCK_OFF', 'USER_FROZEN', 'USER_UNFROZEN', 'AUTO_FRAUD_LOCK', 'ACCESS_DENIED');
ALTER TABLE "SecurityEvent" ALTER COLUMN "type" TYPE "SecurityEventType_new" USING ("type"::text::"SecurityEventType_new");
ALTER TYPE "SecurityEventType" RENAME TO "SecurityEventType_old";
ALTER TYPE "SecurityEventType_new" RENAME TO "SecurityEventType";
DROP TYPE "SecurityEventType_old";
COMMIT;

-- DropIndex
DROP INDEX "SecurityEvent_actorId_idx";

-- DropIndex
DROP INDEX "SecurityEvent_type_createdAt_idx";

-- DropIndex
DROP INDEX "SecurityEvent_userId_idx";

-- DropTable
DROP TABLE "StripeEventLog";
