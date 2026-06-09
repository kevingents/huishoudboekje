-- Nieuwe, genummerde migratie (eerdere migraties NIET bewerken — checksum).
-- Belangrijke contacten/adressen per huishouden.

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'overig',
    "phone" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contact_householdId_idx" ON "Contact"("householdId");
