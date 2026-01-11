-- CreateTable
CREATE TABLE "public"."MemberNote" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberNote_memberId_createdAt_idx" ON "public"."MemberNote"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."MemberNote" ADD CONSTRAINT "MemberNote_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "public"."Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
