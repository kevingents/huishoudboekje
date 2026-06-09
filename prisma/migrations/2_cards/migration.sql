-- Nieuwe, genummerde migratie (0_init/1_rewards NIET bewerken — checksum-veiligheid).
-- Gedeelde klantenkaarten/pasjes, gescoped per huishouden (householdId).

-- CreateTable
CREATE TABLE "Card" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "format" TEXT NOT NULL DEFAULT 'CODE128',
    "imageUrl" TEXT,
    "color" TEXT NOT NULL DEFAULT 'from-sky-400 to-blue-500',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Card_householdId_idx" ON "Card"("householdId");
