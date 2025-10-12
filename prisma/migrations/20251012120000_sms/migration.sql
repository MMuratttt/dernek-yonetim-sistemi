-- SMS & Campaigns Migration
-- Adds enums: MessageChannel, MessageStatus, CampaignStatus
-- Adds tables: SmsCampaign, SmsMessage

DO $$ BEGIN
  CREATE TYPE "public"."MessageChannel" AS ENUM ('SMS','WHATSAPP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."MessageStatus" AS ENUM ('PENDING','SENT','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT','SENDING','COMPLETED','FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "public"."SmsCampaign" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "channel" "public"."MessageChannel" NOT NULL DEFAULT 'SMS',
  "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "totalRecipients" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "SmsCampaign_org_created_idx" ON "public"."SmsCampaign"("organizationId","createdAt");

CREATE TABLE IF NOT EXISTS "public"."SmsMessage" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL REFERENCES "Organization"("id") ON DELETE CASCADE,
  "campaignId" TEXT REFERENCES "SmsCampaign"("id") ON DELETE SET NULL,
  "memberId" TEXT REFERENCES "Member"("id") ON DELETE SET NULL,
  "phone" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "channel" "public"."MessageChannel" NOT NULL DEFAULT 'SMS',
  "status" "public"."MessageStatus" NOT NULL DEFAULT 'PENDING',
  "provider" TEXT,
  "providerMsgId" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "sentAt" TIMESTAMP(3)
);
CREATE INDEX IF NOT EXISTS "SmsMessage_org_campaign_idx" ON "public"."SmsMessage"("organizationId","campaignId");
CREATE INDEX IF NOT EXISTS "SmsMessage_org_status_idx" ON "public"."SmsMessage"("organizationId","status");
