-- Lening: optionele einddatum (yyyy-mm-dd). Na deze datum telt de maandtermijn
-- niet meer mee in "wat je per maand overhoudt".
ALTER TABLE "Loan" ADD COLUMN "endDate" TEXT;

-- Spaardoel: vaste maandinleg (optioneel; anders afgeleid van de streefdatum)
-- en optioneel gekoppeld aan een gezinslid (bijv. sparen voor een kind).
ALTER TABLE "SavingsGoal" ADD COLUMN "monthly" DOUBLE PRECISION;
ALTER TABLE "SavingsGoal" ADD COLUMN "forMember" TEXT;
