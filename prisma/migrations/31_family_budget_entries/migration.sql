-- Gezinspotje: korte geschiedenis van geboekte uitgaven (wat + bedrag + wanneer),
-- zodat je per potje ziet waar het geld heen ging (bijv. "Gezichtscreme €15").
ALTER TABLE "FamilyBudget" ADD COLUMN "entries" JSONB;
