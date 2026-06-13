-- Verwijderde iCal-afspraken onthouden (atomair, geen JSON-race).
CREATE TABLE "HiddenIcalEvent" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "externalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HiddenIcalEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "HiddenIcalEvent_householdId_externalId_key" ON "HiddenIcalEvent"("householdId", "externalId");

CREATE INDEX "HiddenIcalEvent_householdId_idx" ON "HiddenIcalEvent"("householdId");
