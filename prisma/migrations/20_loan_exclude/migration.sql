-- Uitsluit-trefwoord per lening: een transactie die hierop matcht telt NIET als
-- aflossing (bv. "premie" om de normale zorgverzekering uit te sluiten).
ALTER TABLE "Loan" ADD COLUMN "excludePattern" TEXT;
