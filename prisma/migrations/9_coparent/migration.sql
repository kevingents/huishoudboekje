-- Nieuwe, genummerde migratie (eerdere migraties NIET bewerken — checksum).
-- Co-ouderschap stap 3: twee huishoudens koppelen + gedeelde agenda-afspraken.

-- AlterTable
ALTER TABLE "Household" ADD COLUMN "coParentHouseholdId" INTEGER;

-- AlterTable
ALTER TABLE "AgendaEvent" ADD COLUMN "coShared" BOOLEAN NOT NULL DEFAULT false;
