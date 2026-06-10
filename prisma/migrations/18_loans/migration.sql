-- Leningen/hypotheek met restschuld; aflossingen worden via matchPattern
-- gekoppeld aan transacties.
CREATE TABLE "Loan" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lender" TEXT,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "termAmount" DOUBLE PRECISION,
    "matchPattern" TEXT,
    "manualPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Loan_householdId_idx" ON "Loan"("householdId");
