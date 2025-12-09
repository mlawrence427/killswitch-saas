/*
  Warnings:

  - The values [GLOBAL_LOCK_ON,GLOBAL_LOCK_OFF,AUTO_FRAUD_LOCK,ACCESS_DENIED] on the enum `SecurityEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `actorId` on the `SecurityEvent` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SecurityEventType_new" AS ENUM ('LOGIN', 'LOGOUT', 'USER_FROZEN', 'USER_UNFROZEN', 'GLOBAL_LOCK_ENABLED', 'GLOBAL_LOCK_DISABLED');
ALTER TABLE "SecurityEvent" ALTER COLUMN "type" TYPE "SecurityEventType_new" USING ("type"::text::"SecurityEventType_new");
ALTER TYPE "SecurityEventType" RENAME TO "SecurityEventType_old";
ALTER TYPE "SecurityEventType_new" RENAME TO "SecurityEventType";
DROP TYPE "SecurityEventType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "SecurityEvent" DROP CONSTRAINT "SecurityEvent_actorId_fkey";

-- DropForeignKey
ALTER TABLE "SecurityEvent" DROP CONSTRAINT "SecurityEvent_userId_fkey";

-- AlterTable
ALTER TABLE "SecurityEvent" DROP COLUMN "actorId",
ALTER COLUMN "reason" DROP NOT NULL;
