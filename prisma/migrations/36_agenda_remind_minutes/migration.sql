-- Aanlooptijd van agenda-herinneringen van dagen naar minuten (fijnmaziger:
-- 10 min / 1 uur / 1 dag van tevoren). Bestaande dag-waarden omrekenen.
ALTER TABLE "AgendaEvent" ADD COLUMN "remindMinutes" INTEGER;
UPDATE "AgendaEvent" SET "remindMinutes" = "remindDays" * 1440 WHERE "remindDays" IS NOT NULL;
ALTER TABLE "AgendaEvent" DROP COLUMN "remindDays";
