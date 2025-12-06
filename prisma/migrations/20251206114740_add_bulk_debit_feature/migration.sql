-- CreateEnum
CREATE TYPE "public"."DebitType" AS ENUM ('AIDAT', 'TARIH_GIREREK');

-- CreateEnum
CREATE TYPE "public"."ScheduledDebitStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."ScheduledDebit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "debitType" "public"."DebitType" NOT NULL DEFAULT 'AIDAT',
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "year" INTEGER,
    "scheduledDate" TIMESTAMP(6),
    "status" "public"."ScheduledDebitStatus" NOT NULL DEFAULT 'PENDING',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(6),

    CONSTRAINT "ScheduledDebit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ScheduledDebitMember" (
    "id" TEXT NOT NULL,
    "scheduledDebitId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TRY',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledDebitMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ScheduledDebit_organizationId_status_scheduledDate_idx" ON "public"."ScheduledDebit"("organizationId", "status", "scheduledDate");

-- CreateIndex
CREATE INDEX "ScheduledDebitMember_scheduledDebitId_status_idx" ON "public"."ScheduledDebitMember"("scheduledDebitId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledDebitMember_scheduledDebitId_memberId_key" ON "public"."ScheduledDebitMember"("scheduledDebitId", "memberId");

-- AddForeignKey
ALTER TABLE "public"."ScheduledDebit" ADD CONSTRAINT "ScheduledDebit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledDebitMember" ADD CONSTRAINT "ScheduledDebitMember_scheduledDebitId_fkey" FOREIGN KEY ("scheduledDebitId") REFERENCES "public"."ScheduledDebit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ScheduledDebitMember" ADD CONSTRAINT "ScheduledDebitMember_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
