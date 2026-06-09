-- Nieuwe, genummerde migratie (0_init NIET bewerken — checksum-veiligheid).
-- Stijl exact gelijk aan 0_init: SERIAL PK, TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
-- losse pkey-constraint, aparte CREATE INDEX. Geen FK's. Platform-breed (geen householdId).

-- CreateTable
CREATE TABLE "Reward" (
    "id" SERIAL NOT NULL,
    "partner" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "conditions" TEXT,
    "category" TEXT NOT NULL DEFAULT 'uitje',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reward_active_idx" ON "Reward"("active");
