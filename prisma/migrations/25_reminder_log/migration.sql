-- Idempotentie voor de reminder-cron: elke reminder (huishouden + key) één keer.
CREATE TABLE "ReminderLog" (
    "id" SERIAL NOT NULL,
    "householdId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReminderLog_householdId_key_key" ON "ReminderLog"("householdId", "key");

CREATE INDEX "ReminderLog_householdId_idx" ON "ReminderLog"("householdId");
