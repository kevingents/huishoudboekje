-- Taken: toewijzen aan meerdere personen (assignees = JSON-lijst van namen) en een
-- expliciete goedkeuring door een ouder (approvedBy/approvedAt). Status kent nu ook
-- "ingeleverd" (klaar gemeld, wacht op goedkeuring) — geen schemawijziging nodig
-- omdat status een vrije String is.
ALTER TABLE "Task" ADD COLUMN "assignees" TEXT;
ALTER TABLE "Task" ADD COLUMN "approvedBy" TEXT;
ALTER TABLE "Task" ADD COLUMN "approvedAt" TIMESTAMP(3);

-- Agenda: een afspraak aan meerdere personen toewijzen (whoList = JSON-lijst van namen);
-- "who" blijft de weergavewaarde (één naam, een join, of "Gezin").
ALTER TABLE "AgendaEvent" ADD COLUMN "whoList" TEXT;
