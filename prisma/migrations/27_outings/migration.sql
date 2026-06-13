-- Uitjes: ideeën om met het gezin te doen (AI of zelf), met status + agenda-koppeling.
CREATE TABLE "Outing" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "cost" TEXT,
    "area" TEXT,
    "date" TEXT,
    "status" TEXT NOT NULL DEFAULT 'idee',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "agendaEventId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Outing_householdId_idx" ON "Outing"("householdId");
