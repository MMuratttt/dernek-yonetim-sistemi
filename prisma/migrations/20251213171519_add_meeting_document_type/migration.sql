/*
  Warnings:

  - Added the required column `documentType` to the `MeetingDocument` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."MeetingDocumentType" AS ENUM ('DIVAN_TUTANAGI', 'HAZIRUN_LISTESI', 'FAALIYET_RAPORU', 'DENETIM_KURULU_RAPORU');

-- AlterTable
ALTER TABLE "public"."MeetingDocument" ADD COLUMN     "documentType" "public"."MeetingDocumentType" NOT NULL;
