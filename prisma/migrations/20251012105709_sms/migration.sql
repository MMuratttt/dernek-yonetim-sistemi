-- DropForeignKey
ALTER TABLE "public"."SmsCampaign" DROP CONSTRAINT "SmsCampaign_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SmsMessage" DROP CONSTRAINT "SmsMessage_campaignId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SmsMessage" DROP CONSTRAINT "SmsMessage_memberId_fkey";

-- DropForeignKey
ALTER TABLE "public"."SmsMessage" DROP CONSTRAINT "SmsMessage_organizationId_fkey";

-- AddForeignKey
ALTER TABLE "public"."SmsCampaign" ADD CONSTRAINT "SmsCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SmsMessage" ADD CONSTRAINT "SmsMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SmsMessage" ADD CONSTRAINT "SmsMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."SmsCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SmsMessage" ADD CONSTRAINT "SmsMessage_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "public"."SmsCampaign_org_created_idx" RENAME TO "SmsCampaign_organizationId_createdAt_idx";

-- RenameIndex
ALTER INDEX "public"."SmsMessage_org_campaign_idx" RENAME TO "SmsMessage_organizationId_campaignId_idx";

-- RenameIndex
ALTER INDEX "public"."SmsMessage_org_status_idx" RENAME TO "SmsMessage_organizationId_status_idx";
