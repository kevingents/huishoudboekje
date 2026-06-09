-- Nieuwe, genummerde migratie (eerdere migraties NIET bewerken — checksum).
-- Kind-accounts + login↔gezinslid-koppeling + gerichte meldingen.

-- AlterTable
ALTER TABLE "FamilyMember" ADD COLUMN "isChild" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN "memberId" INTEGER;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "targetMember" TEXT;
