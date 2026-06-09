-- Nieuwe, genummerde migratie (eerdere migraties NIET bewerken — checksum).
-- Gezinsspel: taken + ingewisselde beloningen.

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assignedTo" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "dueDate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "member" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_householdId_idx" ON "Task"("householdId");

-- CreateIndex
CREATE INDEX "Redemption_householdId_idx" ON "Redemption"("householdId");
