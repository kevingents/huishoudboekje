-- Uitje: OpenStreetMap-id, zodat dezelfde plek niet dubbel wordt toegevoegd.
ALTER TABLE "Outing" ADD COLUMN "osmId" TEXT;

-- Uniek per huishouden; NULL-waarden (handmatige/AI-uitjes) tellen als uniek.
CREATE UNIQUE INDEX "Outing_householdId_osmId_key" ON "Outing"("householdId", "osmId");
