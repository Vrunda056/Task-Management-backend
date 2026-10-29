-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MANAGER', 'DEVELOPER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'DEVELOPER';
