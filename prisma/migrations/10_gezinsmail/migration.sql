-- Gezinsmail: per-huishouden inbound-mailbox-token + ontvangen mails (MailItem).

ALTER TABLE "Household" ADD COLUMN "inboundToken" TEXT;
CREATE UNIQUE INDEX "Household_inboundToken_key" ON "Household"("inboundToken");

CREATE TABLE "MailItem" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "emailId" TEXT,
    "fromAddr" TEXT NOT NULL,
    "fromName" TEXT,
    "subject" TEXT NOT NULL,
    "snippet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'nieuw',
    "category" TEXT,
    "summary" TEXT,
    "filedType" TEXT,
    "filedId" INTEGER,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MailItem_householdId_idx" ON "MailItem"("householdId");
