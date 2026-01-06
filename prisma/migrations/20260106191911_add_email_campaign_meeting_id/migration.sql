-- AlterTable
ALTER TABLE "public"."EmailCampaign" ADD COLUMN     "meetingId" TEXT;

-- AlterTable
ALTER TABLE "public"."SmsCampaign" ADD COLUMN     "meetingId" TEXT;

-- CreateIndex
CREATE INDEX "EmailCampaign_meetingId_idx" ON "public"."EmailCampaign"("meetingId");

-- CreateIndex
CREATE INDEX "SmsCampaign_meetingId_idx" ON "public"."SmsCampaign"("meetingId");

-- AddForeignKey
ALTER TABLE "public"."SmsCampaign" ADD CONSTRAINT "SmsCampaign_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmailCampaign" ADD CONSTRAINT "EmailCampaign_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;
