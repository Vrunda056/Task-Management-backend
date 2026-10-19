-- CreateEnum
CREATE TYPE "EntryType" AS ENUM ('WORKING_DAY', 'WEEKEND', 'PUBLIC_HOLIDAY', 'PERSONAL_LEAVE');

-- CreateEnum
CREATE TYPE "TaskItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sheetUrl" TEXT;

-- CreateTable
CREATE TABLE "DayEntry" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "entryType" "EntryType" NOT NULL DEFAULT 'WORKING_DAY',
    "label" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "taskName" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskItem" (
    "id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "estimatedTimeMin" INTEGER,
    "actualEffortMin" INTEGER,
    "status" "TaskItemStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DayEntry_userId_date_key" ON "DayEntry"("userId", "date");

-- AddForeignKey
ALTER TABLE "DayEntry" ADD CONSTRAINT "DayEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "DayEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskItem" ADD CONSTRAINT "TaskItem_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
