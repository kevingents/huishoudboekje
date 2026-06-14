-- Zachte maandlimiet op AI-gebruik per huishouden (kostenbescherming tegen misbruik/uitschieters).
CREATE TABLE "AiUsage" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUsage_householdId_period_key" ON "AiUsage"("householdId", "period");
CREATE INDEX "AiUsage_householdId_idx" ON "AiUsage"("householdId");
