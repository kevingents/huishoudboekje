-- Spaardoel: einddatum + cover-thema
ALTER TABLE "SavingsGoal" ADD COLUMN "targetDate" TEXT;
ALTER TABLE "SavingsGoal" ADD COLUMN "theme" TEXT;

-- Gezinsbudget-potjes (envelopes)
CREATE TABLE "FamilyBudget" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "member" TEXT,
    "color" TEXT NOT NULL DEFAULT 'emerald',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FamilyBudget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FamilyBudget_householdId_idx" ON "FamilyBudget"("householdId");
