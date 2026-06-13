-- Agenda: optionele reminder (aantal dagen vóór de afspraak; null = uit)
ALTER TABLE "AgendaEvent" ADD COLUMN "remindDays" INTEGER;
