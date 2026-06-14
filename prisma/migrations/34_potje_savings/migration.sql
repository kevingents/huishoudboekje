-- Spaarplan per gezinspotje: een maandelijks bedrag dat je opzij zet vanuit het
-- potje (verlaagt het besteedbare bedrag van dat potje, dus ook het dagbudget).
ALTER TABLE "FamilyBudget" ADD COLUMN "savings" DOUBLE PRECISION NOT NULL DEFAULT 0;
