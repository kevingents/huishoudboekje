-- Nieuwe, genummerde migratie (eerdere migraties NIET bewerken — checksum).
-- Eigen gezins-beloningen + documenten (garantie/legitimatie met verloopdatum).

-- CreateTable
CREATE TABLE "FamilyReward" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'garantie',
    "owner" TEXT,
    "imageUrl" TEXT,
    "expiresAt" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FamilyReward_householdId_idx" ON "FamilyReward"("householdId");

-- CreateIndex
CREATE INDEX "Document_householdId_idx" ON "Document"("householdId");
