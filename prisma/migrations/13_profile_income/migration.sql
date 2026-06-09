-- Profielgegevens per gebruiker + inkomsten van het huishouden.

ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "address" TEXT;
ALTER TABLE "User" ADD COLUMN "birthday" TEXT;

CREATE TABLE "Income" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'loon',
    "interval" TEXT NOT NULL DEFAULT '1 month',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Income_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Income_householdId_idx" ON "Income"("householdId");
