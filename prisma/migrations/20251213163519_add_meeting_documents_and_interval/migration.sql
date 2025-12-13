-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."MeetingType" ADD VALUE 'OLAGAN_GENEL_KURUL';
ALTER TYPE "public"."MeetingType" ADD VALUE 'OLAGANÜSTÜ_GENEL_KURUL';

-- AlterTable
ALTER TABLE "public"."Meeting" ADD COLUMN     "intervalYears" INTEGER;

-- CreateTable
CREATE TABLE "public"."MeetingDocument" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeetingDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MeetingDocument_meetingId_idx" ON "public"."MeetingDocument"("meetingId");

-- AddForeignKey
ALTER TABLE "public"."MeetingDocument" ADD CONSTRAINT "MeetingDocument_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
