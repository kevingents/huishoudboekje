-- Onthouden hoe een winkel/omschrijving gecategoriseerd moet worden.
-- pattern = genormaliseerd trefwoord (substring-match op de omschrijving).
-- kind: expense (uitgave in category) | income (telt niet mee) |
--       fixed (vaste last) | ignore (sparen/overboeking, telt niet mee).
CREATE TABLE "MerchantRule" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "pattern" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "kind" TEXT NOT NULL DEFAULT 'expense',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MerchantRule_householdId_idx" ON "MerchantRule"("householdId");
