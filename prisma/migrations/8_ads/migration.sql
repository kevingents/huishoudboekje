-- Nieuwe, genummerde migratie (eerdere migraties NIET bewerken — checksum).
-- Platform-brede advertenties/aanbiedingen.

-- CreateTable
CREATE TABLE "Ad" (
    "id" SERIAL NOT NULL,
    "sponsor" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Ad_active_idx" ON "Ad"("active");
